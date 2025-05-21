#!/bin/bash

# List all files with " 2" in their names, excluding .git directory
echo "The following files will be deleted:"
find . -name "* 2*" -type f -not -path "./.git/*" | sort

echo -e "
Do you want to proceed with deletion? (y/n)"
read answer

if [ "$answer" = "y" ]; then
    find . -name "* 2*" -type f -not -path "./.git/*" -delete
    echo "Files deleted successfully."
else
    echo "Deletion cancelled."
fi
