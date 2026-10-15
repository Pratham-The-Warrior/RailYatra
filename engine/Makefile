# Makefile for RailYatra Engine
CXX = g++
CXXFLAGS = -O2 -std=c++17 -static -static-libgcc -static-libstdc++
TARGET = route_engine
SOURCES = main.cpp graph.cpp dijkstra.cpp trip_router.cpp

all: $(TARGET)

$(TARGET): $(SOURCES) $(wildcard *.hpp)
	$(CXX) $(CXXFLAGS) $(SOURCES) -o $(TARGET)

clean:
	rm -f $(TARGET)
