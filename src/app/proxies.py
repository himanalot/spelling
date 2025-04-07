import requests
import re
from bs4 import BeautifulSoup
import time

def get_spys_proxies():
    try:
        c = requests.get("https://spys.me/proxy.txt", timeout=10)
        c.raise_for_status()
        regex = r"[0-9]+(?:\.[0-9]+){3}:[0-9]+"
        matches = re.finditer(regex, c.text, re.MULTILINE)
        return [match.group() for match in matches]
    except Exception as e:
        print("Error fetching from spys.me: {}".format(e))
        return []

def get_freeproxy_list():
    try:
        d = requests.get("https://free-proxy-list.net/", timeout=10)
        d.raise_for_status()
        soup = BeautifulSoup(d.content, 'html.parser')
        td_elements = soup.select('.fpl-list .table tbody tr td')
        proxies = []
        for j in range(0, len(td_elements), 8):
            ip = td_elements[j].text.strip()
            port = td_elements[j + 1].text.strip()
            proxies.append("{}:{}".format(ip, port))
        return proxies
    except Exception as e:
        print("Error fetching from free-proxy-list: {}".format(e))
        return []

def main():
    all_proxies = set()  # Using set to avoid duplicates
    
    # Get proxies from spys.me
    spys_proxies = get_spys_proxies()
    all_proxies.update(spys_proxies)
    print("Found {} proxies from spys.me".format(len(spys_proxies)))
    
    # Get proxies from free-proxy-list
    free_proxies = get_freeproxy_list()
    all_proxies.update(free_proxies)
    print("Found {} proxies from free-proxy-list.net".format(len(free_proxies)))
    
    # Save unique proxies to file
    with open("proxies_list.txt", 'w') as file:
        for proxy in all_proxies:
            file.write(proxy + "\n")
    
    print("Total unique proxies saved: {}".format(len(all_proxies)))

if __name__ == "__main__":
    main()