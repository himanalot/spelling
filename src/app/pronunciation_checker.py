#!/usr/bin/env python3

import requests
from bs4 import BeautifulSoup
import sys
import json
from typing import Dict, List, Optional
import urllib3

# Disable SSL warnings for simplicity
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def check_pronunciation(word: str) -> Dict:
    """
    Check pronunciation for a given word (focusing only on text pronunciations)
    Returns a dictionary with pronunciation information
    """
    url = f"https://www.merriam-webster.com/dictionary/{word}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive'
    }
    
    print(f"Checking pronunciation for: {word}")
    print(f"URL: {url}")
    
    try:
        # Create a session with retries and better timeout handling
        session = requests.Session()
        session.verify = False  # Disable SSL verification for simplicity
        
        # Make the request
        response = session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Result dictionary
        result = {
            'word': word,
            'text_pronunciations': []
        }
        
        # Check for text pronunciations using the specific structure
        # Look for the prons-entries-list-inline span first
        pron_section = soup.find('span', class_='prons-entries-list-inline')
        if pron_section:
            # Find all div.prons-entry-list-item elements within this span
            pronunciation_divs = pron_section.find_all('div', class_='prons-entry-list-item')
            
            for div in pronunciation_divs:
                # Find the mw span inside each div
                mw_span = div.find('span', class_='mw')
                if mw_span:
                    pron_text = mw_span.get_text(strip=True)
                    if pron_text and pron_text not in result['text_pronunciations']:
                        result['text_pronunciations'].append(pron_text)
        
        # If the above specific structure didn't work, try more general selectors
        if not result['text_pronunciations']:
            # Backup approach 1: Look for any span with class='mw'
            mw_spans = soup.find_all('span', class_='mw')
            for span in mw_spans:
                pron_text = span.get_text(strip=True)
                if pron_text and pron_text not in result['text_pronunciations']:
                    result['text_pronunciations'].append(pron_text)
                    
            # Backup approach A: Look for spans with pron-spell-content or pr classes
            if not result['text_pronunciations']:
                for pron_span in soup.find_all('span', class_=['pron-spell-content', 'pr']):
                    pron_text = pron_span.get_text(strip=True).replace('\xa0', '')
                    if pron_text and pron_text not in result['text_pronunciations']:
                        result['text_pronunciations'].append(pron_text)
            
            # Backup approach 2: Look for IPA notation specifically
            if not result['text_pronunciations']:
                ipa_sections = soup.find_all('span', class_='ipa')
                for ipa in ipa_sections:
                    ipa_text = ipa.get_text(strip=True)
                    if ipa_text and ipa_text not in result['text_pronunciations']:
                        result['text_pronunciations'].append(ipa_text)
        
        # If still no pronunciations found, look for the raw HTML structure
        if not result['text_pronunciations']:
            # Include the full HTML of the pronunciation section for debugging
            html_section = soup.find('span', class_='prons-entries-list-inline')
            if html_section:
                result['html_structure'] = str(html_section)
        
        return result
        
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if "404" in str(e):
            return {'word': word, 'error': f"Word not found: {word}"}
    except requests.exceptions.ConnectionError:
        print(f"Connection Error: Could not connect to the server")
        return {'word': word, 'error': "Connection failed"}
    except requests.exceptions.Timeout:
        print(f"Timeout Error: The request timed out")
        return {'word': word, 'error': "Request timed out"}
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {e}")
        return {'word': word, 'error': str(e)}
    except Exception as e:
        print(f"General Error: {e}")
        return {'word': word, 'error': str(e)}
    
    return {'word': word, 'error': "Unknown error"}

def display_pronunciation_result(result: Dict):
    """Display the pronunciation check results in a readable format"""
    print("\n=== Pronunciation Check Results ===")
    print(f"Word: {result['word']}")
    
    if 'error' in result:
        print(f"Error: {result['error']}")
        return
        
    # Display text pronunciations
    if result['text_pronunciations']:
        print("\nText Pronunciations:")
        for i, pron in enumerate(result['text_pronunciations'], 1):
            print(f"  {i}. {pron}")
    else:
        print("\nNo text pronunciations found")
        
        # If we have HTML structure but no pronunciations found, show it
        if 'html_structure' in result:
            print("\nHTML Structure (for debugging):")
            print(result['html_structure'])

def main():
    # Get word from command line or prompt user
    if len(sys.argv) > 1:
        word = sys.argv[1]
    else:
        word = input("Enter a word to check pronunciation: ")
    
    # Clean the word (remove whitespace, convert to lowercase)
    word = word.strip().lower()
    
    if not word:
        print("Please provide a valid word")
        return
        
    # Check pronunciation
    result = check_pronunciation(word)
    
    # Display results
    display_pronunciation_result(result)
    
    # Save results to JSON if requested
    save_option = input("\nDo you want to save these results to a JSON file? (y/n): ")
    if save_option.lower() == 'y':
        filename = f"{word}_pronunciation.json"
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Results saved to {filename}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
    except Exception as e:
        print(f"\nAn error occurred: {e}") 