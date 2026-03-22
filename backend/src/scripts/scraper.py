import requests
import json
import time
import sys
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re

# --- Constants & Configuration ---
BASE_URL = "https://enquiry.indianrail.gov.in/mntes/"
DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Cache-Control': 'max-age=0'
}

class RailRoutePro:
    """
    Main engine for scraping live train running status from official sources.
    Uses a stateless session management to ensure high reliability.
    """
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)

    def _clean(self, text):
        """Removes UI artifacts and deep cleans text for clean data output."""
        if not text:
            return "--"
        junk = ["Coach Position", "*", "JN.", "JN", "Station", "Link", "Map"]
        cleaned = text.replace('\xa0', ' ')
        for word in junk:
            cleaned = cleaned.replace(word, "")
        return " ".join(cleaned.split()).strip()

    def _get_csrf_token(self, retries=2):
        """Fetches the required security token for search requests with retries."""
        for attempt in range(retries + 1):
            timestamp = int(time.time() * 1000)
            try:
                # Add a small delay between retries
                if attempt > 0:
                    time.sleep(1)
                
                res = self.session.get(f"{BASE_URL}GetCSRFToken?t={timestamp}", timeout=10)
                res.raise_for_status()
                
                soup = BeautifulSoup(res.text, 'html.parser')
                token_tag = soup.find('input')
                
                if token_tag:
                    name = token_tag.get('name')
                    value = token_tag.get('value')
                    if name and value:
                        return name, value
                
                # If we get here, the response didn't have the token.
                # It might be an error page or a "Your IP is blocked" page.
                if attempt == retries:
                    snippet = res.text[:200].replace('\n', ' ')
                    return None, f"Token tag missing. Response snippet: {snippet}"
                    
            except Exception as e:
                if attempt == retries:
                    return None, f"Token request failed: {str(e)}"
        
        return None, "All attempts to acquire security token failed."

    def get_status(self, train_no, day_offset=0, save_raw=False):
        """
        Fetches the live status for a specific train and date.
        Automatically falls back to 'Yesterday' if today's journey hasn't started.
        """
        target_date = (datetime.now() + timedelta(days=day_offset)).strftime("%d-%b-%Y")
        
        # Initialize session cookies
        try:
            self.session.get(BASE_URL, timeout=10)
        except Exception:
            pass

        t_name, t_val = self._get_csrf_token()
        if not t_val:
            # t_name contains the error message if t_val is None
            return {"error": f"Security token acquisition failed: {t_name or 'Unknown reason'}"}

        payload = {
            'trainNo': train_no,
            'trainStartDate': target_date,
            't': int(time.time() * 1000),
            t_name: t_val
        }
        
        url = f"{BASE_URL}tr?opt=TrainRunning&subOpt=FindRunningInstance"
        try:
            response = self.session.post(url, data=payload, timeout=20)
            response.raise_for_status()
        except Exception as e:
            return {"error": f"Connection failed: {str(e)}"}
        
        if save_raw:
            with open(f"html_{train_no}.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            
        result = self._parse_html(response.text, train_no, target_date)

        # Automatic multiday fallback (Recursive call)
        status = result.get("meta", {}).get("status", "").lower()
        if (day_offset >= -2) and (not result.get("itinerary") or "yet to start" in status):
            return self.get_status(train_no, day_offset=day_offset-1, save_raw=save_raw)

        return result

    def _parse_html(self, html, train_no, target_date):
        """Identifies the correct date container and parses station stop cards."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for invalid train
        for h in soup.find_all('h4'):
            if 'invalid train no' in h.get_text().lower():
                return {"error": "Invalid Train Number or the train does not exist."}
        
        # Scope search to exactly the box for this date
        container_id = f"train{target_date.lower()}"
        container = soup.find('div', id=container_id) or soup.find('div', class_='tab-pane active')
        
        if not container or "yet to start" in container.get_text().lower():
            return {
                "meta": {
                    "train_no": train_no, 
                    "start_date": target_date, 
                    "current_location": "Journey not yet started",
                    "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "status": "Yet to start"
                }, 
                "itinerary": []
            }

        header = container.find_parent().find('h6', class_='text-primary') or soup.find('h6', class_='text-primary')
        header_text = header.get_text() if header else ""
        
        if not header_text:
            # Fallback for destination reached or missing header
            b_tags = container.find_all('b')
            for b_tag in b_tags:
                txt = b_tag.get_text(strip=True)
                if txt.startswith("Arrived at") or txt.startswith("Departed from"):
                    header_text = txt
                    break
            if not header_text:
                for b_tag in b_tags:
                    if "Reached Destination" in b_tag.get_text(strip=True):
                        header_text = "Reached Destination"
                        break

        current_loc = self._clean(header_text) if header_text else "Unknown"

        itinerary = []
        cards = [c for c in container.find_all('div', class_='w3-card-2') 
                 if 'w3-sand' not in c.get('class', []) and c.find_all('div', recursive=False)]

        for idx, card in enumerate(cards):
            root_divs = card.find_all('div', recursive=False)
            if len(root_divs) < 3:
                continue
            
            # Column mapping in the UI
            arrival_col = root_divs[0]
            info_wrapper = root_divs[2].find_all('div', recursive=False)
            if len(info_wrapper) < 2:
                continue
            
            station_col, departure_col = info_wrapper[0], info_wrapper[1]

            def extract_times(node):
                """Helper to extract HH:MM from bold tags, returning all found."""
                return [b.get_text(strip=True).replace('*', '') 
                        for b in node.find_all('b') if ":" in b.get_text()]

            arr_times = extract_times(arrival_col) if idx != 0 else ["SOURCE"]
            dep_times = extract_times(departure_col) if idx != len(cards)-1 else ["DEST"]

            full_name = self._clean(station_col.find('b').get_text())
            code_match = re.search(r'\(([A-Z]{2,})\)', full_name)
            station_code = code_match.group(1) if code_match else ""
            station_name = re.sub(r'\s*\([A-Z]{2,}\)', '', full_name).strip()

            status_span = card.find('span', class_=lambda x: x and ('w3-green' in x or 'w3-red' in x))
            
            # Map UI colors to delay flags
            is_delayed = False
            if status_span:
                is_delayed = any('w3-red' in c for c in status_span.get('class', []))

            # Extract distance (KM)
            distance_km = 0
            km_b_tag = card.find('b', string=re.compile(r'^\d+$'))
            if km_b_tag and 'KMs' in km_b_tag.parent.get_text():
                distance_km = int(km_b_tag.get_text())
            elif not km_b_tag:
                # Fallback: search in all text
                km_text = card.get_text()
                km_match = re.search(r'(\d+)\s+KMs', km_text)
                if km_match:
                    distance_km = int(km_match.group(1))

            itinerary.append({
                "station": station_name,
                "station_code": station_code,
                "distance_km": distance_km,
                "platform": self._clean(station_col.find('span', class_='w3-orange').get_text()) if station_col.find('span', class_='w3-orange') else "N/A",
                "status": self._clean(status_span.get_text()) if status_span else "On Time",
                "is_delayed": is_delayed,
                "is_source": idx == 0,
                "is_destination": idx == len(cards)-1,
                "timings": {
                    "sch_arr": arr_times[0],
                    "act_arr": arr_times[1] if len(arr_times) > 1 else arr_times[0],
                    "sch_dep": dep_times[0],
                    "act_dep": dep_times[1] if len(dep_times) > 1 else dep_times[0]
                }
            })

        return {
            "meta": {
                "train_no": train_no,
                "start_date": target_date,
                "current_location": current_loc,
                "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_stations": len(itinerary)
            },
            "itinerary": itinerary
        }

if __name__ == "__main__":
    engine = RailRoutePro()
    
    # Mode 1: Programmatic CLI (Used by Node.js backend)
    if len(sys.argv) > 1:
        train_id = sys.argv[1].strip()
        save_mode = "--save" in sys.argv
        
        # Filter out the flag from train_id if it was passed first
        if train_id == "--save" and len(sys.argv) > 2:
            train_id = sys.argv[2].strip()

        report = engine.get_status(train_id, save_raw=save_mode)
        
        # Ensure UTF-8 output for Windows pipes
        if save_mode:
            with open(f"final_{train_id}.json", "w", encoding="utf-8") as f:
                json.dump(report, f, indent=4)
                
        sys.stdout.reconfigure(encoding='utf-8')
        print(json.dumps(report, ensure_ascii=False))
        sys.exit(0)
    
    # Mode 2: Interactive CLI
    val = input("Enter Train Number: ").strip()
    print(f"📡 Querying official servers for {val}...")
    final_report = engine.get_status(val)
    
    with open(f"status_{val}.json", "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=4)
    
    print("-" * 30)
    print(f"✅ Success! Report saved to status_{val}.json")
    print(f"📍 Current: {final_report['meta'].get('current_location', 'N/A')}")
    print("-" * 30)