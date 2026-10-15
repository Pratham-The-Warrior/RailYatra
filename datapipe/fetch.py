"""
PoliteFetcher: the only way pipeline sources download anything.

Built for sources that PERMIT automated access (licensed APIs, open-data
portals, feeds published for reuse). It deliberately does not, and must not be
extended to, rotate proxies, spoof browser identities, solve CAPTCHAs or
replay security tokens: getting past a site's access controls is not a data
strategy (it breaks without warning and carries legal risk). If a site blocks
us, the answer is a licence or a different source.

Behaviour:
  - honest User-Agent with a contact address (required in config)
  - honours robots.txt (unless the source config states it is a licensed API
    endpoint covered by an agreement: `robots: "agreement"`)
  - per-host minimum interval between requests
  - retries with exponential backoff on 429/5xx, honouring Retry-After
  - on-disk cache with ETag / Last-Modified revalidation, so unchanged data
    costs the provider (and us) almost nothing
"""
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
import urllib.robotparser
from urllib.parse import urlparse


class FetchError(Exception):
    pass


class PoliteFetcher:
    def __init__(self, user_agent, cache_dir, min_interval_s=2.0, max_retries=4,
                 timeout_s=60, max_bytes=500 * 1024 * 1024, sleep=time.sleep, opener=None):
        if not user_agent or '@' not in user_agent and 'http' not in user_agent:
            raise ValueError('user_agent must identify us and include a contact (email or URL)')
        self.user_agent = user_agent
        self.cache_dir = cache_dir
        self.min_interval_s = min_interval_s
        self.max_retries = max_retries
        self.timeout_s = timeout_s
        self.max_bytes = max_bytes
        self._sleep = sleep
        self._open = opener or urllib.request.urlopen
        self._last_request = {}
        self._robots = {}
        os.makedirs(cache_dir, exist_ok=True)

    # -- robots.txt ------------------------------------------------------
    def allowed(self, url):
        parts = urlparse(url)
        base = f'{parts.scheme}://{parts.netloc}'
        if base not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                req = urllib.request.Request(base + '/robots.txt', headers={'User-Agent': self.user_agent})
                with self._open(req, timeout=self.timeout_s) as r:
                    rp.parse(r.read().decode('utf-8', 'replace').splitlines())
            except urllib.error.HTTPError as e:
                # Standard semantics: 4xx = no restrictions, 5xx = assume disallowed.
                rp.parse([] if 400 <= e.code < 500 else ['User-agent: *', 'Disallow: /'])
            except Exception:
                rp.parse(['User-agent: *', 'Disallow: /'])
            self._robots[base] = rp
        return self._robots[base].can_fetch(self.user_agent, url)

    # -- cache -----------------------------------------------------------
    def _cache_paths(self, url):
        h = hashlib.sha256(url.encode()).hexdigest()[:32]
        return os.path.join(self.cache_dir, h + '.body'), os.path.join(self.cache_dir, h + '.meta.json')

    def _throttle(self, host):
        wait = self._last_request.get(host, 0) + self.min_interval_s - time.monotonic()
        if wait > 0:
            self._sleep(wait)
        self._last_request[host] = time.monotonic()

    def get(self, url, robots='respect', headers=None):
        """Returns response bytes (from cache if the server says unchanged)."""
        if robots == 'respect' and not self.allowed(url):
            raise FetchError(f'robots.txt disallows {url}; get permission or use another source')
        body_path, meta_path = self._cache_paths(url)
        meta = {}
        if os.path.exists(meta_path) and os.path.exists(body_path):
            with open(meta_path) as f:
                meta = json.load(f)
        req_headers = {'User-Agent': self.user_agent, **(headers or {})}
        if meta.get('etag'):
            req_headers['If-None-Match'] = meta['etag']
        if meta.get('last_modified'):
            req_headers['If-Modified-Since'] = meta['last_modified']

        host = urlparse(url).netloc
        for attempt in range(self.max_retries + 1):
            self._throttle(host)
            try:
                with self._open(urllib.request.Request(url, headers=req_headers), timeout=self.timeout_s) as r:
                    data = r.read(self.max_bytes + 1)
                    if len(data) > self.max_bytes:
                        raise FetchError(f'{url} exceeds max_bytes')
                    with open(body_path, 'wb') as f:
                        f.write(data)
                    with open(meta_path, 'w') as f:
                        json.dump({'url': url, 'etag': r.headers.get('ETag'),
                                   'last_modified': r.headers.get('Last-Modified'),
                                   'fetched_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}, f)
                    return data
            except urllib.error.HTTPError as e:
                if e.code == 304 and os.path.exists(body_path):
                    with open(body_path, 'rb') as f:
                        return f.read()
                if e.code == 429 or 500 <= e.code < 600:
                    if attempt == self.max_retries:
                        raise FetchError(f'{url}: HTTP {e.code} after {attempt + 1} attempts')
                    retry_after = e.headers.get('Retry-After') if e.headers else None
                    delay = float(retry_after) if retry_after and retry_after.isdigit() else 2 ** attempt * 5
                    self._sleep(min(delay, 600))
                    continue
                raise FetchError(f'{url}: HTTP {e.code}')
            except urllib.error.URLError as e:
                if attempt == self.max_retries:
                    raise FetchError(f'{url}: {e.reason}')
                self._sleep(2 ** attempt * 5)
        raise FetchError(f'{url}: gave up')
