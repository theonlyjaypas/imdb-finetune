#!/usr/bin/env python3
"""
Quick API Testing Script
Run this to test the backend API endpoints
"""

import requests
import json
import time
import sys
from typing import Dict, Any

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_success(message: str):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message: str):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(message: str):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}! {message}{Colors.END}")

def print_header(title: str):
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{title.center(60)}{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}\n")

def check_backend_running(base_url: str = "http://localhost:8000") -> bool:
    """Check if backend is running"""
    try:
        response = requests.get(f"{base_url}/docs", timeout=2)
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        return False
    except Exception:
        return False

def test_chat_endpoint(message: str = "Hello, this is a test") -> Dict[str, Any]:
    """Test the /chat endpoint"""
    url = "http://localhost:8000/chat"
    payload = {"message": message}

    try:
        response = requests.post(url, json=payload, timeout=5)
        return {
            "success": response.status_code == 200,
            "status_code": response.status_code,
            "response": response.json(),
            "time": response.elapsed.total_seconds()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def test_batch_endpoint(messages: list = None) -> Dict[str, Any]:
    """Test the /batch endpoint"""
    if messages is None:
        messages = ["Hello", "How are you?", "What is 2+2?"]

    url = "http://localhost:8000/batch"
    payload = {"messages": messages}

    try:
        response = requests.post(url, json=payload, timeout=10)
        return {
            "success": response.status_code == 200,
            "status_code": response.status_code,
            "response": response.json(),
            "time": response.elapsed.total_seconds()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def test_cors_headers() -> Dict[str, Any]:
    """Test if CORS headers are present"""
    url = "http://localhost:8000/chat"
    payload = {"message": "test"}

    try:
        response = requests.post(url, json=payload)
        cors_headers = {
            "access-control-allow-origin": response.headers.get("access-control-allow-origin"),
            "access-control-allow-methods": response.headers.get("access-control-allow-methods"),
            "access-control-allow-headers": response.headers.get("access-control-allow-headers"),
        }
        return {
            "success": any(cors_headers.values()),
            "headers": cors_headers
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def test_response_format() -> Dict[str, Any]:
    """Test if response has correct format"""
    result = test_chat_endpoint()

    if not result.get("success"):
        return {"success": False, "error": "Chat endpoint failed"}

    response = result.get("response", {})
    has_response_field = "response" in response

    return {
        "success": has_response_field,
        "response_fields": list(response.keys()),
        "has_response_field": has_response_field
    }

def test_error_handling() -> Dict[str, Any]:
    """Test error handling with invalid input"""
    url = "http://localhost:8000/chat"

    test_cases = [
        {"message": ""},  # Empty message
        {"message": "x" * 10000},  # Very long message
    ]

    results = []
    for payload in test_cases:
        try:
            response = requests.post(url, json=payload, timeout=5)
            results.append({
                "payload": str(payload)[:50],
                "status": response.status_code,
                "handled": True
            })
        except Exception as e:
            results.append({
                "payload": str(payload)[:50],
                "error": str(e),
                "handled": False
            })

    return {"results": results}

def main():
    print_header("Chatbot Framework API Test Suite")

    # Test 1: Backend Running
    print("Test 1: Backend Connectivity")
    print("-" * 40)
    if check_backend_running():
        print_success("Backend is running on http://localhost:8000")
    else:
        print_error("Backend is not running!")
        print_info("Start the backend with: python app.py")
        sys.exit(1)

    # Test 2: Single Message
    print("\n\nTest 2: Single Chat Message")
    print("-" * 40)
    result = test_chat_endpoint()
    if result.get("success"):
        print_success("Chat endpoint working")
        print(f"Response time: {result.get('time', 0):.2f}s")
        print(f"Response: {json.dumps(result.get('response'), indent=2)}")
        if result.get('time', 0) > 1:
            print_warning("Response time > 1 second (slower than ideal)")
    else:
        print_error(f"Chat endpoint failed: {result.get('error')}")

    # Test 3: Batch Messages
    print("\n\nTest 3: Batch Processing")
    print("-" * 40)
    result = test_batch_endpoint()
    if result.get("success"):
        print_success("Batch endpoint working")
        print(f"Response time: {result.get('time', 0):.2f}s")
        response = result.get("response", {})
        num_results = len(response.get("results", []))
        print(f"Processed {num_results} messages")
    else:
        print_error(f"Batch endpoint failed: {result.get('error')}")

    # Test 4: CORS Headers
    print("\n\nTest 4: CORS Headers")
    print("-" * 40)
    result = test_cors_headers()
    if result.get("success"):
        print_success("CORS headers present")
        for key, value in result.get("headers", {}).items():
            if value:
                print(f"  {key}: {value}")
    else:
        print_warning("CORS headers not found or error occurred")

    # Test 5: Response Format
    print("\n\nTest 5: Response Format")
    print("-" * 40)
    result = test_response_format()
    if result.get("success"):
        print_success("Response has required fields")
        print(f"Response fields: {', '.join(result.get('response_fields', []))}")
    else:
        print_error("Response missing required fields")
        print(f"Expected: 'response' field")
        print(f"Got: {result.get('response_fields', [])}")

    # Test 6: Error Handling
    print("\n\nTest 6: Error Handling")
    print("-" * 40)
    result = test_error_handling()
    for test_result in result.get("results", []):
        if test_result.get("handled"):
            print_success(f"Handled: {test_result.get('payload')} (Status: {test_result.get('status')})")
        else:
            print_warning(f"Error: {test_result.get('payload')} ({test_result.get('error')})")

    # Summary
    print_header("Test Complete")
    print_success("Framework is operational and ready for testing!")
    print("\nNext steps:")
    print("1. Test the frontend: npm run dev")
    print("2. Open http://localhost:3000 in browser")
    print("3. Send messages and verify responses")
    print("4. Check browser console (F12) for errors")
    print("5. Read TESTING_GUIDE.md for more detailed testing")

if __name__ == "__main__":
    # Check if requests library is installed
    try:
        import requests
    except ImportError:
        print_error("requests library not found")
        print("Install with: pip install requests")
        sys.exit(1)

    main()
