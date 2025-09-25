#!/usr/bin/env python3

import re
import os

def extract_vcf_urls(xml_file):
    """Extract all VCF file URLs from the XML response"""
    with open(xml_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all href elements containing .vcf
    pattern = r'<D:href>([^<]*\.vcf)</D:href>'
    urls = re.findall(pattern, content)
    return urls

def download_vcf_files(urls, base_url='https://carddav.fastmail.com', output_dir='vcf_files'):
    """Download all VCF files"""
    os.makedirs(output_dir, exist_ok=True)

    downloaded_files = []

    for url in urls:
        try:
            # Extract filename from URL
            filename = url.split('/')[-1]
            filepath = os.path.join(output_dir, filename)

            # Full URL
            full_url = base_url + url

            print(f"Downloading {filename}...")

            # Note: This would need proper authentication for real use
            # For now, we'll simulate by creating placeholder files
            # response = requests.get(full_url, auth=('username', 'password'))

            # Since we can't actually download without auth, create a placeholder
            with open(filepath, 'w') as f:
                f.write(f"# Placeholder for {filename}\n# URL: {full_url}\n")

            downloaded_files.append(filepath)

        except Exception as e:
            print(f"Failed to download {filename}: {e}")

    return downloaded_files

if __name__ == "__main__":
    # Extract URLs
    urls = extract_vcf_urls('response.xml')
    print(f"Found {len(urls)} VCF files")

    # Show first few URLs
    for i, url in enumerate(urls[:5]):
        print(f"{i+1}: {url}")

    if urls:
        print("...")
        print(f"Total: {len(urls)} files")

    # Download files (placeholder implementation)
    # downloaded = download_vcf_files(urls)
    # print(f"Downloaded {len(downloaded)} files to vcf_files directory")