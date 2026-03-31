import requests
try:
    r = requests.get('http://localhost:8000/search?q=Bao')
    print(r.json())
except Exception as e:
    print(e)
