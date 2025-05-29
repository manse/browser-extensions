for file in ./*/icons/icon.png; do
  dir=$(dirname "$file")
  convert "$file" -resize 16x16 "$dir/16.png"
  convert "$file" -resize 48x48 "$dir/48.png"
  convert "$file" -resize 128x128 "$dir/128.png"
done