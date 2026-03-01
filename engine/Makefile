# Makefile for RailYatra Engine
CXX = g++
CXXFLAGS = -O2 -std=c++17
TARGET = route_engine
SOURCES = main.cpp graph.cpp dijkstra.cpp

all: $(TARGET)

$(TARGET): $(SOURCES)
	$(CXX) $(CXXFLAGS) $(SOURCES) -o $(TARGET)

clean:
	rm -f $(TARGET)
