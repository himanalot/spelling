import pdfplumber

def is_header(text):
    return text.startswith('2004 Scripps') or text.startswith('Page')

def is_bold(char):
    return 'Bold' in char['fontname']

def is_valid_word_char(char):
    return char.isalpha() or char in "'-"

bold_words = set()
title_words = {'Page', '2004', 'Scripps', 'National', 'Spelling', 'Bee', 'Consolidated', 'Word', 'List', 'Words', 'Appearing', 'Infrequent'}

with pdfplumber.open('infrequent_cwl.pdf') as pdf:
    for page_num, page in enumerate(pdf.pages, 1):
        print(f"Processing page {page_num}")
        chars = page.chars
        
        # Sort characters by their vertical position first, then horizontal
        chars.sort(key=lambda x: (round(x['top']), x['x0']))
        
        current_word = ''
        last_y = None
        last_x = None
        
        for char in chars:
            if not is_bold(char):
                continue
                
            text = char['text']
            if not is_valid_word_char(text):
                continue
                
            current_y = round(char['top'])
            current_x = char['x0']
            
            # Check for new line or significant horizontal gap
            if (last_y is not None and abs(current_y - last_y) > 5) or \
               (last_x is not None and current_x - last_x > 10):
                if current_word and len(current_word) > 1 and current_word not in title_words and not is_header(current_word):
                    bold_words.add(current_word.lower())
                current_word = ''
            
            current_word += text
            last_y = current_y
            last_x = current_x + char['width']
        
        # Add the last word of the page
        if current_word and len(current_word) > 1 and current_word not in title_words and not is_header(current_word):
            bold_words.add(current_word.lower())

# Write the sorted words to a file
with open('infrequent_bold_words.txt', 'w') as f:
    for word in sorted(bold_words):
        f.write(word + '\n')

print(f"Extracted {len(bold_words)} bold words") 