#!/usr/bin/env python3

import requests
from bs4 import BeautifulSoup
import json
import os
import time
import sys
import urllib3
import random
from threading import Lock
from typing import Dict, List, Optional
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Global lock for printing
print_lock = Lock()

class ProxyManager:
    def __init__(self):
        """Initialize with verified working proxies from JSON file"""
        with open('working_proxies_20250403_201006.json', 'r') as f:
            proxy_data = json.load(f)
            proxy_urls = proxy_data['proxies']
            
        self.proxies = [{"http": url, "https": None} for url in proxy_urls]
        random.shuffle(self.proxies)  # Randomize initial order
        
        # Track proxy status
        self.proxy_status = {str(p): True for p in self.proxies}
        self.proxy_last_used = {str(p): 0 for p in self.proxies}
        self.proxy_index = 0
        self.proxy_lock = Lock()  # Add lock for thread safety
        
        # Create a session with optimized settings
        self.session = requests.Session()
        self.session.verify = False
        self.session.trust_env = False
        
        # Optimize retry settings
        retries = Retry(
            total=2,  # Reduced from 3 to 2
            backoff_factor=0.05,  # Reduced from 0.1
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST"]
        )
        
        # Increase connection pooling even more
        adapter = HTTPAdapter(
            max_retries=retries,
            pool_connections=75,  # Increased from 50
            pool_maxsize=75,  # Increased from 50
            pool_block=False
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        
        # Add default headers
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        })
        
        with print_lock:
            print(f"Loaded {len(self.proxies)} verified proxies")

    def get_next_proxy(self) -> Dict[str, str]:
        """Get next working proxy with minimum pause between uses"""
        with self.proxy_lock:
            for _ in range(len(self.proxies)):
                proxy = self.proxies[self.proxy_index]
                self.proxy_index = (self.proxy_index + 1) % len(self.proxies)
                
                # Check if proxy is marked as working
                if not self.proxy_status[str(proxy)]:
                    continue
                    
                # Ensure minimum pause between uses of same proxy
                last_used = self.proxy_last_used[str(proxy)]
                if last_used > 0:
                    elapsed = time.time() - last_used
                    if elapsed < 1.0:  # Reduced from 2.0s to 1.0s - balanced value
                        continue
                
                self.proxy_last_used[str(proxy)] = time.time()
                return proxy
            
            # If we get here, reset all proxies and try again
            for p in self.proxy_status:
                self.proxy_status[p] = True
            return self.get_next_proxy()

    def mark_proxy_status(self, proxy: Dict[str, str], success: bool):
        """Mark proxy as working or failed"""
        with self.proxy_lock:
            if success:
                self.proxy_status[str(proxy)] = True
            else:
                self.proxy_status[str(proxy)] = False
                
                # Check if we have any working proxies left
                if not any(self.proxy_status.values()):
                    for p in self.proxy_status:
                        self.proxy_status[p] = True

def safe_print(*args, **kwargs):
    """Thread-safe printing function"""
    with print_lock:
        print(*args, **kwargs)

def check_pronunciation(word: str, proxy_manager: ProxyManager) -> Dict:
    """
    Check pronunciation for a given word (focusing only on text pronunciations)
    Uses the same proxy handling as webster_scraper.py
    """
    # URL encode problematic characters in word
    safe_word = requests.utils.quote(word)
    url = f"https://www.merriam-webster.com/dictionary/{safe_word}"
    
    max_retries = 2  # Reduced from 3 to 2
    for attempt in range(max_retries):
        try:
            current_proxy = proxy_manager.get_next_proxy()
            
            # Don't print every check to reduce log noise
            if attempt == 0:
                with print_lock:
                    print(f"Checking pronunciation for '{word}' using proxy {current_proxy['http']}...")
            
            # Add varying user agent and headers to avoid detection
            headers = {
                'User-Agent': f'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{random.randint(100, 125)}.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.merriam-webster.com/browse/dictionary/a',
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
            }
            
            # Reduced sleep time for better performance
            time.sleep(random.uniform(0.5, 1.5))  # Reduced from 1.0-3.0s to 0.5-1.5s
            
            response = proxy_manager.session.get(
                url,
                proxies=current_proxy,
                timeout=10,  # Reduced from 15 to 10 seconds
                verify=False,
                allow_redirects=True,
                headers=headers
            )
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
            
            proxy_manager.mark_proxy_status(current_proxy, True)
            return result
            
        except requests.exceptions.HTTPError as e:
            error_msg = str(e)
            if "403" in error_msg:
                # Forbidden - proxy might be blocked, mark as failed
                proxy_manager.mark_proxy_status(current_proxy, False)
            elif "404" in error_msg:
                # Word not found - don't retry
                proxy_manager.mark_proxy_status(current_proxy, True)
                return {'word': word, 'text_pronunciations': []}
            else:
                # Other HTTP error
                proxy_manager.mark_proxy_status(current_proxy, False)
                
            with print_lock:
                print(f"Error checking '{word}' (attempt {attempt + 1}/{max_retries}): {error_msg}")
                
            if attempt < max_retries - 1:
                time.sleep(random.uniform(1.0, 2.0))  # Random delay between attempts
        
        except Exception as e:
            with print_lock:
                print(f"Error checking '{word}' (attempt {attempt + 1}/{max_retries}): {str(e)}")
            proxy_manager.mark_proxy_status(current_proxy, False)
            if attempt < max_retries - 1:
                time.sleep(random.uniform(1.0, 2.0))
    
    return {'word': word, 'text_pronunciations': []}  # Return empty list instead of error for consistency

def display_pronunciation_result(result: Dict):
    """Display the pronunciation check results in a readable format"""
    with print_lock:
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

def process_single_file(file_path: str, proxy_manager: ProxyManager):
    """Process a single pronunciation file"""
    try:
        # Change the file path from pronunciations to words
        words_file_path = file_path.replace("_pronunciations.json", "_words.json")
        if not os.path.exists(words_file_path):
            safe_print(f"Words file not found: {words_file_path}")
            return 0, 0
            
        # Load words file first
        with open(words_file_path, 'r', encoding='utf-8') as f:
            words_data = json.load(f)
            
        # Load pronunciations file if it exists
        pron_file_exists = os.path.exists(file_path)
        if pron_file_exists:
            with open(file_path, 'r', encoding='utf-8') as f:
                pronunciations = json.load(f)
        else:
            pronunciations = []
            
        # Create a map of words to their existing pronunciation entries
        word_to_pron_entries = {}
        for entry in pronunciations:
            word = entry['word']
            if word not in word_to_pron_entries:
                word_to_pron_entries[word] = []
            word_to_pron_entries[word].append(entry)
            
        total_words = len(words_data)
        safe_print(f"Processing {words_file_path} ({total_words} words)...")
        
        # Find words that need text pronunciations
        words_to_process = []
        for word_entry in words_data:
            word = word_entry['word']
            # Skip words we already processed
            if word in word_to_pron_entries:
                # Check if any entry for this word already has text_pronunciations
                has_text_pron = any('text_pronunciations' in entry for entry in word_to_pron_entries[word])
                if not has_text_pron:
                    words_to_process.append(word)
            else:
                # Word doesn't have any pronunciation entries yet
                words_to_process.append(word)
                
        if not words_to_process:
            safe_print(f"No words need text pronunciations in {words_file_path}")
            return 0, total_words
            
        # Deduplicate words to process (though they should already be unique)
        words_to_process = list(set(words_to_process))
        
        safe_print(f"Found {len(words_to_process)} words needing text pronunciations out of {total_words} total words")
        
        # Process in moderately sized batches for better efficiency
        batch_size = 20  # Increased from 10 to 15
        batches = [words_to_process[i:i + batch_size] for i in range(0, len(words_to_process), batch_size)]
        
        # Use more workers for better parallelism
        worker_count = 50  # Increased from 15 to 25
        safe_print(f"Processing in {len(batches)} batches with {worker_count} workers...")
        
        # Track changes and new entries
        updated_count = 0
        new_entries_count = 0
        
        # Process all batches with ThreadPoolExecutor
        completed_batches = 0
        for batch_num, batch in enumerate(batches, 1):
            safe_print(f"Processing batch {batch_num}/{len(batches)}...")
            
            # Reduced delay between batches
            if batch_num > 1:
                time.sleep(random.uniform(2.0, 5.0))  # Reduced from 5.0-10.0s to 2.0-5.0s
            
            # Process batch with ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=worker_count) as executor:
                futures = {
                    executor.submit(check_pronunciation, word, proxy_manager): word
                    for word in batch
                }
                
                for future in as_completed(futures):
                    word = futures[future]
                    try:
                        result = future.result()
                        if result and 'text_pronunciations' in result and result['text_pronunciations']:
                            # Get the pronunciation data
                            text_prons = result['text_pronunciations']
                            
                            # Update existing entries if any
                            if word in word_to_pron_entries:
                                for entry in word_to_pron_entries[word]:
                                    entry['text_pronunciations'] = text_prons
                                    updated_count += 1
                                    
                                with print_lock:
                                    print(f"  Updated pronunciations for '{word}': {text_prons}")
                            else:
                                # Create a new pronunciation entry if none exists
                                new_entry = {
                                    "word": word,
                                    "pronunciation_number": 1,
                                    "pronunciation_text": None,  # We don't have this yet
                                    "audio_dir": None,
                                    "audio_file": None, 
                                    "audio_url": None,
                                    "text_pronunciations": text_prons,
                                    "scraped_at": datetime.now().isoformat()
                                }
                                pronunciations.append(new_entry)
                                
                                # Update our tracking dict
                                if word not in word_to_pron_entries:
                                    word_to_pron_entries[word] = []
                                word_to_pron_entries[word].append(new_entry)
                                
                                new_entries_count += 1
                                with print_lock:
                                    print(f"  Added new pronunciation for '{word}': {text_prons}")
                        else:
                            # For empty results, still create a record to avoid re-checking
                            if word not in word_to_pron_entries:
                                # Create a new entry with empty text pronunciations
                                new_entry = {
                                    "word": word,
                                    "pronunciation_number": 1,
                                    "pronunciation_text": None,
                                    "audio_dir": None,
                                    "audio_file": None,
                                    "audio_url": None,
                                    "text_pronunciations": [],
                                    "scraped_at": datetime.now().isoformat()
                                }
                                pronunciations.append(new_entry)
                                new_entries_count += 1
                            else:
                                # Add empty list to existing entries
                                for entry in word_to_pron_entries[word]:
                                    entry['text_pronunciations'] = []
                                    updated_count += 1
                    except Exception as e:
                        safe_print(f"Error processing '{word}': {e}")
                        # Continue with other words
            
            # Save checkpoint after every batch
            completed_batches += 1
            if completed_batches % 3 == 0 or batch_num == len(batches):  # Changed from 2 to 3 (less frequent saves)
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(pronunciations, f, indent=2, ensure_ascii=False)
                
                total_updated = updated_count + new_entries_count
                progress_pct = (total_updated / len(words_to_process)) * 100 if words_to_process else 0
                safe_print(f"Checkpoint saved after batch {batch_num}. Updated {updated_count} entries, added {new_entries_count} new entries ({progress_pct:.1f}%).")
        
        # Save final results
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(pronunciations, f, indent=2, ensure_ascii=False)
            
        total_updated = updated_count + new_entries_count
        safe_print(f"Completed {file_path}: Updated {updated_count} entries, added {new_entries_count} new entries. Total {total_updated} out of {total_words} words.")
        return total_updated, total_words
    
    except Exception as e:
        safe_print(f"Error processing file {file_path}: {e}")
        return 0, 0

def process_pronunciation_files():
    """Process all pronunciation files from a to z and update them"""
    # Initialize proxy manager
    proxy_manager = ProxyManager()
    
    # Find all pronunciation files for each letter
    letters = 'abcdefghijklmnopqrstuvwxyz'
    total_updated = 0
    total_processed = 0
    
    for letter in letters:
        # Define the pronunciation file path (create if doesn't exist)
        pron_file = f"{letter}_dictionary_data.json_pronunciations.json"
        
        updated, processed = process_single_file(pron_file, proxy_manager)
        total_updated += updated
        total_processed += processed
    
    safe_print(f"\nAll files processed. Updated/added {total_updated} of {total_processed} entries.")

def test_single_word(word: str):
    """Test the pronunciation checker on a single word and print results"""
    # Initialize proxy manager
    proxy_manager = ProxyManager()
    
    # Check pronunciation
    result = check_pronunciation(word, proxy_manager)
    
    # Display results
    display_pronunciation_result(result)
    return result

def main():
    # Check command-line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--test" and len(sys.argv) > 2:
            # Run in test mode for a single word
            word = sys.argv[2].strip().lower()
            test_single_word(word)
        else:
            # Unknown argument
            print("Usage:")
            print("  To process all files: python update_pronunciations.py")
            print("  To test a single word: python update_pronunciations.py --test <word>")
    else:
        # Run the full processing
        process_pronunciation_files()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")