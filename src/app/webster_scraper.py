import requests
from bs4 import BeautifulSoup
import sys
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from threading import Lock
import multiprocessing
from tqdm import tqdm
import random
import os
import json
from typing import Dict, List, Optional, Set
from datetime import datetime
import urllib3
from urllib3.util.retry import Retry
from requests.adapters import HTTPAdapter

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Global lock for printing
print_lock = Lock()

# Global proxy manager
_proxy_manager = None

LETTER_PAGES = {
    'b': 72,
    'c': 109,
    'e': 38,
    'f': 47,
    'g': 41,
    'h': 45,
    'i': 38,
    'j': 11,
    'k': 15,
    'l': 38,
    'm': 62,
    'n': 28,
    'o': 32,
    'p': 101,
    'q': 6,
    'r': 55,
    's': 134,
    't': 65,
    'u': 28,
    'v': 16,
    'w': 32,
    'x': 2,
    'y': 5,
    'z': 4
}

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
            total=3,  # Reduced from 5
            backoff_factor=0.1,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST"]
        )
        
        # Increase connection pooling
        adapter = HTTPAdapter(
            max_retries=retries,
            pool_connections=50,  # Increased from 20
            pool_maxsize=50,     # Increased from 20
            pool_block=False     # Don't block when pool is full
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
                    if elapsed < 0.2:  # Reduced from 0.5s to 0.2s
                        continue  # Skip instead of sleeping
                
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

    def validate_proxy(self, proxy: Dict[str, str]) -> bool:
        """Quick check if proxy is responsive"""
        try:
            response = self.session.get(
                'http://www.merriam-webster.com',
                proxies=proxy,
                timeout=5,  # Reduced from 10s
                verify=False,
                allow_redirects=True
            )
            return response.status_code == 200
        except:
            return False

def safe_print(*args, **kwargs):
    """Thread-safe printing function"""
    with print_lock:
        print(*args, **kwargs)

def get_total_pages(proxy_manager: ProxyManager) -> int:
    """Get the total number of pages available"""
    url = "https://www.merriam-webster.com/browse/dictionary/d/1"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
    }
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            proxy = proxy_manager.get_next_proxy()
            print(f"\nGetting total pages using proxy {proxy['http']}...")
            
            response = proxy_manager.session.get(
                url, 
                headers=headers, 
                proxies=proxy, 
                timeout=20
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find pagination text that shows "page 1 of X"
            pagination = soup.find('span', class_='counters')
            if pagination:
                text = pagination.text.strip()
                total_pages = int(text.split('of')[-1].strip())
                proxy_manager.mark_proxy_status(proxy, True)
                return total_pages
            else:
                raise Exception("Could not find pagination info")
                
        except Exception as e:
            print(f"Error getting total pages (attempt {attempt + 1}/{max_retries}): {str(e)}")
            proxy_manager.mark_proxy_status(proxy, False)
            if attempt < max_retries - 1:
                time.sleep(2)
            continue
    
    return 58  # Default to 58 pages as seen earlier

def get_page_words(page: int, proxy_manager: ProxyManager, letter: str = 'a') -> List[str]:
    """Get words from a specific page"""
    url = f"https://www.merriam-webster.com/browse/dictionary/{letter}/{page}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.merriam-webster.com/browse/dictionary/d'
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            proxy = proxy_manager.get_next_proxy()
            print(f"\nFetching page {page} using proxy {proxy['http']}...")
            
            response = proxy_manager.session.get(
                url, 
                headers=headers, 
                proxies=proxy, 
                timeout=20,
                verify=False,
                allow_redirects=True
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            page_words = []
            
            # Find all word links in the browse list
            word_links = soup.select('div.mw-grid-table-list li')
            for link in word_links:
                word = link.text.strip()
                if word:
                    page_words.append(word)
            
            if page_words:
                print(f"Found {len(page_words)} words on page {page}")
                proxy_manager.mark_proxy_status(proxy, True)
                return page_words
            else:
                # Print the HTML for debugging
                print("DEBUG: No words found. HTML structure:")
                print(soup.prettify()[:2000])  # Print first 2000 chars
                raise Exception("No words found on page")
                
        except Exception as e:
            print(f"Error on page {page} (attempt {attempt + 1}/{max_retries}): {str(e)}")
            proxy_manager.mark_proxy_status(proxy, False)
            if attempt < max_retries - 1:
                time.sleep(2)
    
    return []

def scrape_word(word: str, proxy_manager: ProxyManager) -> Optional[Dict]:
    """Scrape definition for a single word"""
    url = "https://www.merriam-webster.com/dictionary/{}".format(word)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
    }
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            current_proxy = proxy_manager.get_next_proxy()
            if not proxy_manager.validate_proxy(current_proxy):
                continue
                
            response = proxy_manager.session.get(
                url, 
                headers=headers, 
                proxies=current_proxy, 
                timeout=30,
                verify=False,
                allow_redirects=True
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Get word class (part of speech)
            word_class = None
            pos_spans = soup.select('span.fl')
            if pos_spans:
                word_class = pos_spans[0].text.strip()
            
            # Get syllables and pronunciations
            syllables = None
            pronunciations = []
            
            # Find the main pronunciation section
            pron_section = soup.find('span', class_='prons-entries-list-inline')
            if pron_section:
                # Get all pronunciation links
                pron_links = pron_section.find_all('a', class_='play-pron-v2')
                
                for pron_link in pron_links:
                    # Get the pronunciation text (remove &nbsp; and other whitespace)
                    pron_text = pron_link.get_text(strip=True).replace('\xa0', '')
                    if not pron_text:
                        continue
                    
                    # Get audio information
                    audio_dir = pron_link.get('data-dir')
                    audio_file = pron_link.get('data-file')
                    
                    if audio_dir and audio_file:
                        audio_url = f"https://media.merriam-webster.com/audio/prons/en/us/mp3/{audio_dir}/{audio_file}.mp3"
                    else:
                        audio_url = None
                        
                    pronunciations.append({
                        'text': pron_text,
                        'audio_dir': audio_dir,
                        'audio_file': audio_file,
                        'audio_url': audio_url
                    })
                    
                    # Use the first pronunciation as syllables if not set
                    if syllables is None:
                        syllables = pron_text
            
            # Get etymology if available
            etymology = None
            etym_element = soup.select_one('p.et')
            if etym_element:
                etymology = etym_element.text.strip()
            
            # Get definitions and examples
            definitions = []
            definition_groups = soup.select('div.sense')
            
            for group_num, group in enumerate(definition_groups, 1):
                # Get the definition text
                definition_element = group.select_one('span.dtText')
                if not definition_element:
                    continue
                    
                # Clean up definition text
                definition_text = definition_element.get_text(separator=' ', strip=True)
                if definition_text.startswith(': '):
                    definition_text = definition_text[2:]
                
                # Get example sentences for this definition
                examples = []
                example_elements = group.select('span.ex-sent')
                for example in example_elements:
                    # Get the example text
                    example_text = example.get_text(separator=' ', strip=True)
                    
                    # Get attribution if available
                    attribution = None
                    auth_element = example.select_one('span.auth')
                    if auth_element:
                        attribution = auth_element.get_text(strip=True)
                    
                    examples.append({
                        'text': example_text,
                        'attribution': attribution
                    })
                
                definitions.append({
                    'definition_number': group_num,
                    'definition_text': definition_text,
                    'examples': examples
                })
            
            result = {
                'word': word,
                'part_of_speech': word_class,
                'syllables': syllables,
                'pronunciations': pronunciations,
                'etymology': etymology,
                'definitions': definitions,
                'scraped_at': datetime.utcnow().isoformat()
            }
            
            safe_print("Scraped: {}".format(word))
            proxy_manager.mark_proxy_status(current_proxy, True)
            return result
                
        except Exception as e:
            safe_print("Error scraping '{}' (attempt {}/{}): {}".format(word, attempt + 1, max_retries, str(e)))
            proxy_manager.mark_proxy_status(current_proxy, False)
            if attempt < max_retries - 1:
                time.sleep(2)
            continue
    
    return None

def save_results_to_json(results: List[Dict], base_filename: str = "dictionary_data"):
    """
    Save the scraped results in JSON format, split into separate files for words, definitions, and pronunciations
    for easier database import
    """
    # Prepare data structures
    words_data = []
    definitions_data = []
    examples_data = []
    pronunciations_data = []
    
    for result in results:
        if not result:
            continue
            
        # Word entry
        word_entry = {
            'word': result['word'],
            'part_of_speech': result['part_of_speech'],
            'syllables': result['syllables'],
            'etymology': result['etymology'],
            'scraped_at': result['scraped_at']
        }
        words_data.append(word_entry)
        
        # Definition and example entries
        for definition in result['definitions']:
            definition_entry = {
                'word': result['word'],
                'definition_number': definition['definition_number'],
                'definition_text': definition['definition_text'],
                'scraped_at': result['scraped_at']
            }
            definitions_data.append(definition_entry)
            
            # Example entries for this definition
            for example_num, example in enumerate(definition['examples'], 1):
                example_entry = {
                    'word': result['word'],
                    'definition_number': definition['definition_number'],
                    'example_number': example_num,
                    'example_text': example['text'],
                    'attribution': example['attribution'],
                    'scraped_at': result['scraped_at']
                }
                examples_data.append(example_entry)
        
        # Pronunciation entries
        for index, pron in enumerate(result['pronunciations'], 1):
            pron_entry = {
                'word': result['word'],
                'pronunciation_number': index,
                'pronunciation_text': pron['text'],
                'audio_dir': pron['audio_dir'],
                'audio_file': pron['audio_file'],
                'audio_url': pron['audio_url'],
                'scraped_at': result['scraped_at']
            }
            pronunciations_data.append(pron_entry)
    
    # Save words
    words_file = "{}_words.json".format(base_filename)
    with open(words_file, 'w', encoding='utf-8') as f:
        json.dump(words_data, f, indent=2, ensure_ascii=False)
    print("Saved {} words to {}".format(len(words_data), words_file))
    
    # Save definitions
    definitions_file = "{}_definitions.json".format(base_filename)
    with open(definitions_file, 'w', encoding='utf-8') as f:
        json.dump(definitions_data, f, indent=2, ensure_ascii=False)
    print("Saved {} definitions to {}".format(len(definitions_data), definitions_file))
    
    # Save examples
    examples_file = "{}_examples.json".format(base_filename)
    with open(examples_file, 'w', encoding='utf-8') as f:
        json.dump(examples_data, f, indent=2, ensure_ascii=False)
    print("Saved {} examples to {}".format(len(examples_data), examples_file))
    
    # Save pronunciations
    pronunciations_file = "{}_pronunciations.json".format(base_filename)
    with open(pronunciations_file, 'w', encoding='utf-8') as f:
        json.dump(pronunciations_data, f, indent=2, ensure_ascii=False)
    print("Saved {} pronunciations to {}".format(len(pronunciations_data), pronunciations_file))
    
    # Save metadata
    metadata = {
        'total_words': len(words_data),
        'total_definitions': len(definitions_data),
        'total_examples': len(examples_data),
        'total_pronunciations': len(pronunciations_data),
        'scrape_completed_at': datetime.utcnow().isoformat(),
        'average_definitions_per_word': len(definitions_data) / len(words_data) if words_data else 0,
        'average_examples_per_definition': len(examples_data) / len(definitions_data) if definitions_data else 0,
        'average_pronunciations_per_word': len(pronunciations_data) / len(words_data) if words_data else 0
    }
    
    metadata_file = "{}_metadata.json".format(base_filename)
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print("Saved metadata to {}".format(metadata_file))

def get_words_for_letter(proxy_manager: ProxyManager, letter: str) -> List[str]:
    """Get words from all pages for a specific letter"""
    all_words = []
    retry_pages = []
    total_pages = LETTER_PAGES[letter]
    print(f"\nStarting to collect words for letter '{letter}' from {total_pages} pages...")
    
    with ThreadPoolExecutor(max_workers=50) as executor:
        future_to_page = {
            executor.submit(get_page_words, page, proxy_manager, letter): page
            for page in range(1, total_pages + 1)
        }
        
        # Process results as they complete
        for future in as_completed(future_to_page):
            page = future_to_page[future]
            try:
                words = future.result()
                if words:
                    all_words.extend(words)
                    print(f"Found {len(words)} words on page {page}. Total words so far: {len(all_words)}")
                else:
                    print(f"Warning: No words found on page {page}, will retry")
                    retry_pages.append(page)
            except Exception as e:
                print(f"Error processing page {page}: {str(e)}")
                retry_pages.append(page)
    
    # Retry failed pages with fresh proxies
    if retry_pages:
        print(f"\nRetrying {len(retry_pages)} failed pages...")
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_page = {
                executor.submit(get_page_words, page, proxy_manager, letter): page
                for page in retry_pages
            }
            
            for future in as_completed(future_to_page):
                page = future_to_page[future]
                try:
                    words = future.result()
                    if words:
                        all_words.extend(words)
                        print(f"Found {len(words)} words on retry of page {page}")
                except Exception as e:
                    print(f"Page {page} failed again: {str(e)}")
    
    # Remove duplicates while preserving order
    seen = set()
    unique_words = [x for x in all_words if not (x in seen or seen.add(x))]
    
    print(f"\nFinal word count after removing duplicates: {len(unique_words)}")
    return unique_words

def save_checkpoint(words_processed: List[str], results: List[Dict], base_filename: str = "dictionary_data"):
    """Save checkpoint of progress and partial results"""
    # Save checkpoint of processed words
    checkpoint_file = "{}_checkpoint.json".format(base_filename)
    checkpoint_data = {
        'words_processed': words_processed,
        'last_updated': datetime.utcnow().isoformat()
    }
    with open(checkpoint_file, 'w', encoding='utf-8') as f:
        json.dump(checkpoint_data, f, indent=2)
    
    # Save partial results
    save_results_to_json(results, base_filename)
    safe_print("Checkpoint saved: {} words processed".format(len(words_processed)))

def load_checkpoint(base_filename: str = "dictionary_data") -> tuple:
    """Load checkpoint data if it exists"""
    checkpoint_file = "{}_checkpoint.json".format(base_filename)
    try:
        if os.path.exists(checkpoint_file):
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                checkpoint_data = json.load(f)
                return set(checkpoint_data['words_processed']), []  # Return empty results as we'll load from JSON
    except Exception as e:
        safe_print("Error loading checkpoint: {}".format(e))
    return set(), []

def get_proxy_manager():
    """Get or create the global proxy manager instance"""
    global _proxy_manager
    if _proxy_manager is None:
        _proxy_manager = ProxyManager()
    return _proxy_manager

def scrape_word_wrapper(word):
    """Wrapper function for multiprocessing"""
    proxy_manager = get_proxy_manager()  # Get the global instance
    return scrape_word(word, proxy_manager)

def process_word_batch(batch_args):
    """Process a batch of words using a shared proxy manager"""
    words, start_idx = batch_args
    proxy_manager = get_proxy_manager()
    results = []
    
    for i, word in enumerate(words):
        try:
            result = scrape_word(word, proxy_manager)
            if result:
                results.append(result)
        except Exception as e:
            print(f"Error processing word {word}: {str(e)}")
    
    return results

def main():
    # Initialize global proxy manager
    global _proxy_manager
    _proxy_manager = ProxyManager()
    
    # Ask about scraping definitions once at the start
    scrape_definitions = input("\nWould you like to scrape definitions for all words? (y/n): ").lower() == 'y'
    
    # If scraping definitions, ask about checkpoint behavior once
    resume_from_checkpoints = False
    if scrape_definitions:
        response = input("\nWould you like to resume from checkpoints if they exist? (y/n): ").lower() == 'y'
        resume_from_checkpoints = response
    
    # Process each letter sequentially
    for letter in LETTER_PAGES.keys():
        print(f"\nCollecting all words starting with '{letter}'...")
        words = get_words_for_letter(_proxy_manager, letter)
        print(f"\nFound {len(words)} total words for letter '{letter}'")
        
        # Save words to a simple file
        with open(f"{letter}_words.txt", 'w', encoding='utf-8') as f:
            for word in words:
                f.write(word + '\n')
        print(f"Saved word list to {letter}_words.txt")
        
        if scrape_definitions:
            # Load checkpoint if enabled
            processed_words, results = load_checkpoint(f"{letter}_dictionary_data_checkpoint.json")
            if processed_words and resume_from_checkpoints:
                print(f"\nResuming from checkpoint with {len(processed_words)} words already processed")
            else:
                processed_words = set()
                results = []
            
            # Filter out already processed words
            words_to_process = [w for w in words if w not in processed_words]
            if not words_to_process:
                print(f"All words for letter '{letter}' have been processed!")
                continue
                
            print(f"\nProcessing {len(words_to_process)} remaining words for letter '{letter}'...")
            
            # Use existing batch processing logic
            num_processes = min(50, multiprocessing.cpu_count() * 2)
            batch_size = 10
            print(f"Using {num_processes} processes with batch size {batch_size}")
            
            # Create batches with start indices
            batches = []
            for i in range(0, len(words_to_process), batch_size):
                batch = words_to_process[i:i + batch_size]
                batches.append((batch, i))
            
            total_batches = len(batches)
            
            # Process all batches with improved concurrency
            with ProcessPoolExecutor(max_workers=num_processes) as executor:
                futures = []
                for batch_args in batches:
                    futures.append(executor.submit(process_word_batch, batch_args))
                
                # Process results as they complete
                completed = 0
                for future in tqdm(as_completed(futures), total=len(futures), desc="Processing batches"):
                    try:
                        batch_results = future.result()
                        if batch_results:
                            results.extend(batch_results)
                            processed_words.update([r['word'] for r in batch_results])
                        
                        completed += 1
                        if completed % 5 == 0:  # Save checkpoint every 5 batches
                            save_checkpoint(list(processed_words), results, f"{letter}_dictionary_data")
                            print(f"\nProgress: {len(processed_words)}/{len(words)} words ({len(processed_words)/len(words)*100:.1f}%)")
                            
                    except Exception as e:
                        print(f"\nBatch failed: {str(e)}")
            
            # Save final results with letter prefix
            print(f"\nSaving final results for letter '{letter}'...")
            save_results_to_json(results, f"{letter}_dictionary_data.json")
            print("Data has been saved in JSON format")
            
            # Clean up checkpoint file after successful completion
            checkpoint_file = f"{letter}_dictionary_data_checkpoint.json"
            if os.path.exists(checkpoint_file):
                os.remove(checkpoint_file)
                print("Cleaned up checkpoint file")
        else:
            print(f"Skipping definition scraping for letter '{letter}'. Words saved in {letter}_words.txt")
            
        print(f"\nCompleted processing letter '{letter}'")
        print("=" * 80)  # Visual separator between letters

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Progress has been saved in the last checkpoint.")
    except Exception as e:
        print("\nAn error occurred: {}".format(e))
        print("Progress has been saved in the last checkpoint.") 