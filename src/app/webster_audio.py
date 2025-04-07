import requests
import os
import random
import time
from typing import List, Optional, Dict
from requests.exceptions import RequestException

class ProxyManager:
    def __init__(self, proxy_file: str = "proxies_list.txt"):
        self.proxies = self._load_proxies(proxy_file)
        self.current_index = 0
        self.working_proxies = set()
        self.failed_proxies = set()
        print("Loaded {} proxies from {}".format(len(self.proxies), proxy_file))
    
    def _load_proxies(self, proxy_file: str) -> List[str]:
        try:
            with open(proxy_file, 'r') as f:
                return [line.strip() for line in f if line.strip()]
        except Exception as e:
            print("Error loading proxies from file: {}".format(e))
            return []
    
    def get_next_proxy(self) -> dict:
        if not self.proxies:
            return {}
        
        # Try to use a working proxy first
        if self.working_proxies:
            proxy = random.choice(list(self.working_proxies))
        else:
            # Skip failed proxies
            while self.proxies:
                proxy = self.proxies[self.current_index]
                self.current_index = (self.current_index + 1) % len(self.proxies)
                if proxy not in self.failed_proxies:
                    break
            else:
                return {}
        
        return {
            'http': 'http://{}'.format(proxy),
            'https': 'http://{}'.format(proxy)
        }
    
    def mark_proxy_status(self, proxy: dict, success: bool):
        """Mark proxy as working or failed"""
        if not proxy:
            return
            
        proxy_str = proxy['http'].replace('http://', '')
        if success:
            self.working_proxies.add(proxy_str)
            self.failed_proxies.discard(proxy_str)
        else:
            self.failed_proxies.add(proxy_str)
            self.working_proxies.discard(proxy_str)
    
    def validate_proxy(self, proxy: dict) -> bool:
        if not proxy:
            return True
            
        try:
            test_url = 'https://www.merriam-webster.com'
            response = requests.get(
                test_url,
                proxies=proxy,
                timeout=10,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            )
            success = response.status_code == 200
            self.mark_proxy_status(proxy, success)
            return success
        except:
            self.mark_proxy_status(proxy, False)
            return False

def download_pronunciation(
    word: str,
    audio_params: Dict[str, str],
    max_retries: int = 5,
    retry_delay: int = 2
) -> bool:
    """
    Download pronunciation audio file for a word using proxies from proxies_list.txt
    
    Args:
        word: The word to download pronunciation for
        audio_params: Dictionary containing 'dir' and 'file' parameters
        max_retries: Maximum number of retry attempts
        retry_delay: Delay between retries in seconds
    
    Returns:
        bool: True if download was successful, False otherwise
    """
    
    # Base URL for audio files
    base_url = "https://media.merriam-webster.com/audio/prons/en/us/mp3"
    
    # Extract parameters from the URL
    dir_param = audio_params.get('dir', '')
    file_param = audio_params.get('file', '')
    
    # Construct the audio file URL
    audio_url = "{}/{}/{}.mp3".format(base_url, dir_param, file_param)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.merriam-webster.com/'
    }
    
    # Initialize proxy manager
    proxy_manager = ProxyManager()
    
    for attempt in range(max_retries):
        try:
            # Get next proxy
            current_proxy = proxy_manager.get_next_proxy()
            
            # Validate proxy before using
            if not proxy_manager.validate_proxy(current_proxy):
                print("Proxy validation failed, trying next proxy...")
                continue
            
            # Create audio directory if it doesn't exist
            if not os.path.exists('audio'):
                os.makedirs('audio')
            
            # Download the audio file
            response = requests.get(
                audio_url,
                headers=headers,
                proxies=current_proxy,
                timeout=30
            )
            response.raise_for_status()
            
            # Save the file
            output_file = "audio/{}_pronunciation.mp3".format(word)
            with open(output_file, 'wb') as f:
                f.write(response.content)
            
            print("Successfully downloaded pronunciation for '{}' to {}".format(word, output_file))
            if current_proxy:
                print("Using working proxy: {}".format(current_proxy['http']))
            return True
            
        except RequestException as e:
            print("Attempt {}/{} failed: {}".format(attempt + 1, max_retries, str(e)))
            if current_proxy:
                proxy_manager.mark_proxy_status(current_proxy, False)
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            continue
            
        except Exception as e:
            print("Unexpected error: {}".format(str(e)))
            return False
    
    print("Failed to download pronunciation for '{}' after {} attempts".format(word, max_retries))
    return False

if __name__ == "__main__":
    # Audio parameters from the example URL
    audio_params = {
        'dir': 's',
        'file': 'splan01m'
    }
    
    # Try downloading with proxy support
    success = download_pronunciation(
        'splanchnicectomy',
        audio_params,
        max_retries=5,
        retry_delay=2
    ) 