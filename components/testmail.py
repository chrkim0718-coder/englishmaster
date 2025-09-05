import requests

SERVICE_ID = "e0vYiJ2jhrWQhHq3X"
TEMPLATE_ID = "template_fdoifna"
PUBLIC_KEY = "V1f9XlaEvICZaWChj"

def send_temp_password_email(to_email, temp_password):
    url = "https://api.emailjs.com/api/v1.0/email/send"
    payload = {
        "service_id": SERVICE_ID,
        "template_id": TEMPLATE_ID,
        "user_id": PUBLIC_KEY,
        "template_params": {
            "to_email": to_email,
            "temp_password": temp_password
        }
    }
    response = requests.post(url, json=payload)
    print("Status:", response.status_code)
    print("Response:", response.text)

# 사용 예시
send_temp_password_email("phiskim@email.com", "test1234")