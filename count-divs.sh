#!/bin/bash
open=$(grep -o "<div" src/App.tsx | wc -l)
close=$(grep -o "</div>" src/App.tsx | wc -l)
echo "Open: $open"
echo "Close: $close"
