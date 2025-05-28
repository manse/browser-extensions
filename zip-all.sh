#!/bin/bash

OUTPUT_DIR="dist"

mkdir -p "$OUTPUT_DIR"

for dir in */; do
  dirname="${dir%/}"

  if [ -d "$dir" ] && [ "$dirname" != "$OUTPUT_DIR" ]; then
    (cd "$dirname" && zip -r "../${OUTPUT_DIR}/${dirname}.zip" ./*)
  fi
done
