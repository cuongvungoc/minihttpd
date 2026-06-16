CC=gcc
CFLAGS=-Wall -Wextra -Werror -O2 -g -Iinclude
LDFLAGS=

SRC=$(wildcard src/*.c)
OBJ=$(SRC:.c=.o)

TARGET=minihttpd

all: $(TARGET)

$(TARGET): $(OBJ)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

clean:
	rm -f src/*.o $(TARGET)																																											  