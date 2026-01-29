
import requests
import json

url = 'http://localhost:8000/api/token/'
data = {
    'username': 'admin',
    'password': 'admin'
}

print(f"Attempting login to {url} with username='admin'...")

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        print("Login SUCCESS!")
        print("Tokens received.")
    else:
        print("Login FAILED.")
        print(f"Response: {response.text}")
        
except requests.exceptions.ConnectionError:
    print("CONNECTION ERROR: Could not connect to localhost:8000. Is the backend running?")
except Exception as e:
    print(f"An error occurred: {e}")
