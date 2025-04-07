#!/usr/bin/env python3

import json
import os
import sys
from tqdm import tqdm

def clear_text_pronunciations():
    """
    Clear the 'text_pronunciations' field from all dictionary JSON files
    so we can restart the pronunciation scraping process.
    """
    # Find all pronunciation files for each letter
    letters = 'abcdefghijklmnopqrstuvwxyz'
    total_files = 0
    total_entries = 0
    total_cleared = 0
    
    for letter in letters:
        # Look for the specific pattern we're processing
        file_pattern = f"{letter}_dictionary_data.json_pronunciations.json"
        
        if os.path.exists(file_pattern):
            print(f"Processing {file_pattern}...")
            total_files += 1
            
            try:
                # Load the JSON file
                with open(file_pattern, 'r', encoding='utf-8') as f:
                    pronunciations = json.load(f)
                
                file_entries = len(pronunciations)
                total_entries += file_entries
                file_cleared = 0
                
                # Clear the text_pronunciations field from each entry
                for entry in pronunciations:
                    if 'text_pronunciations' in entry:
                        del entry['text_pronunciations']
                        file_cleared += 1
                
                total_cleared += file_cleared
                
                # Save the updated file
                with open(file_pattern, 'w', encoding='utf-8') as f:
                    json.dump(pronunciations, f, indent=2, ensure_ascii=False)
                
                print(f"  Cleared {file_cleared} of {file_entries} entries in {file_pattern}")
                
            except Exception as e:
                print(f"Error processing {file_pattern}: {e}")
        else:
            print(f"File not found: {file_pattern}")
    
    print(f"\nSummary:")
    print(f"Processed {total_files} files")
    print(f"Cleared 'text_pronunciations' from {total_cleared} of {total_entries} total entries")

def clear_specific_file(file_path):
    """Clear text_pronunciations from a specific file"""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    try:
        # Load the JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            pronunciations = json.load(f)
        
        file_entries = len(pronunciations)
        file_cleared = 0
        
        # Clear the text_pronunciations field from each entry
        for entry in tqdm(pronunciations, desc=f"Clearing {file_path}"):
            if 'text_pronunciations' in entry:
                del entry['text_pronunciations']
                file_cleared += 1
        
        # Save the updated file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(pronunciations, f, indent=2, ensure_ascii=False)
        
        print(f"Cleared {file_cleared} of {file_entries} entries in {file_path}")
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def main():
    """Main function to handle command-line arguments"""
    # Check if a specific file was provided
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        print(f"Clearing text_pronunciations from specific file: {file_path}")
        clear_specific_file(file_path)
    else:
        # Process all files
        confirmation = input("This will clear all text_pronunciations data from all pronunciation files. Continue? (y/n): ")
        if confirmation.lower() == 'y':
            clear_text_pronunciations()
        else:
            print("Operation cancelled.")

if __name__ == "__main__":
    main() 