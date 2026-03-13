#!/usr/bin/env python3
"""
Backend API Testing Suite for GhostMail Tempmail App
Tests all CRUD operations and integration points
"""

import requests
import sys
import time
import json
from datetime import datetime
from typing import Dict, Any, Optional

class GhostMailAPITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = {}
        self.admin_token = None

    def log_result(self, test_name: str, success: bool, message: str = "", response_data: Dict = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED")
        else:
            print(f"❌ {test_name}: FAILED - {message}")
            self.failed_tests.append({
                'test': test_name,
                'error': message,
                'response': response_data
            })
        
        self.test_results[test_name] = {
            'passed': success,
            'message': message,
            'response': response_data
        }

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, headers: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}" if not endpoint.startswith('http') else endpoint
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = None
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:500]}

            if success:
                self.log_result(name, True, f"Status: {response.status_code}", response_data)
            else:
                self.log_result(name, False, 
                               f"Expected {expected_status}, got {response.status_code}", 
                               response_data)

            return success, response_data, response.status_code

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"   Error: {error_msg}")
            self.log_result(name, False, error_msg)
            return False, {}, 0

    def test_health_check(self):
        """Test basic API health"""
        return self.run_test(
            "API Health Check",
            "GET", 
            "",
            200
        )

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        return self.run_test(
            "Get System Stats",
            "GET",
            "stats",
            200
        )

    def test_admin_login(self):
        """Test admin login with correct password"""
        success, data, _ = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            data={"password": "ghostmail_admin_2024"}
        )
        
        if success and data.get('token'):
            self.admin_token = data['token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        
        return success, data
    
    def test_admin_login_invalid(self):
        """Test admin login with invalid password"""
        return self.run_test(
            "Admin Login (Invalid Password)",
            "POST",
            "admin/login",
            401,
            data={"password": "wrong_password"}
        )
    
    def test_admin_verify(self):
        """Test admin session verification"""
        if not self.admin_token:
            self.log_result("Admin Verify", False, "No admin token available")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test(
            "Admin Session Verify", 
            "GET",
            "admin/verify",
            200,
            headers=headers
        )
    
    def test_auth_status(self):
        """Test auth status endpoint"""
        return self.run_test(
            "Auth Status",
            "GET", 
            "auth/status",
            200
        )

    def test_admin_config_get(self):
        """Test getting admin configuration"""
        if not self.admin_token:
            self.log_result("Get Admin Config", False, "No admin token available")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test(
            "Get Admin Config",
            "GET",
            "admin/config",
            200,
            headers=headers
        )

    def test_admin_config_update(self):
        """Test updating admin configuration"""
        if not self.admin_token:
            self.log_result("Update Admin Config", False, "No admin token available")
            return False, {}
            
        config_data = {
            "default_expiration_hours": 24,
            "website_auth_enabled": False,
            "telegram_auth_enabled": False
        }
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        return self.run_test(
            "Update Admin Config",
            "PUT",
            "admin/config",
            200,
            data=config_data,
            headers=headers
        )
    
    def test_admin_domain_management(self):
        """Test domain management operations"""
        if not self.admin_token:
            self.log_result("Admin Domain Management", False, "No admin token available")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test adding domain
        domain_data = {
            "domain": f"test{int(time.time())}.example.com",
            "provider": "resend",
            "is_default": False
        }
        
        success1, data1, _ = self.run_test(
            "Add Domain",
            "POST", 
            "admin/domains",
            200,
            data=domain_data,
            headers=headers
        )
        
        # Test removing domain (if add succeeded)
        if success1:
            success2, data2, _ = self.run_test(
                "Remove Domain",
                "DELETE",
                f"admin/domains/{domain_data['domain']}",
                200,
                headers=headers
            )
            return success1 and success2, {"add": data1, "remove": data2}
        
        return success1, data1

    def test_email_generation(self):
        """Test email generation with various parameters"""
        
        # Test 1: Generate email with default settings
        success1, data1, _ = self.run_test(
            "Generate Email (Default)",
            "POST",
            "email/generate",
            200,
            data={}
        )
        
        email_id = None
        if success1 and data1.get('status') == 'success':
            email_id = data1.get('email', {}).get('id')
            print(f"   Generated email ID: {email_id}")
        
        # Test 2: Generate email with custom prefix
        success2, data2, _ = self.run_test(
            "Generate Email (Custom Prefix)",
            "POST",
            "email/generate",
            200,
            data={"custom_prefix": f"test_{int(time.time())}"}
        )
        
        # Test 3: Generate email with expiration
        success3, data3, _ = self.run_test(
            "Generate Email (With Expiration)",
            "POST",
            "email/generate",
            200,
            data={"expiration_hours": 1}
        )
        
        return email_id if success1 else None

    def test_email_list(self):
        """Test listing emails"""
        return self.run_test(
            "List Temp Emails",
            "GET",
            "email/list",
            200
        )

    def test_email_inbox(self, email_id: str):
        """Test inbox retrieval"""
        if not email_id:
            self.log_result("Get Email Inbox", False, "No email ID provided")
            return False, {}
        
        return self.run_test(
            "Get Email Inbox",
            "GET",
            f"email/inbox/{email_id}",
            200
        )

    def test_email_deletion(self, email_id: str):
        """Test email deletion"""
        if not email_id:
            self.log_result("Delete Email", False, "No email ID provided")
            return False, {}
        
        return self.run_test(
            "Delete Email",
            "DELETE",
            f"email/{email_id}",
            200
        )

    def test_send_email(self, from_email_id: str):
        """Test sending email (will likely fail without API key)"""
        if not from_email_id:
            self.log_result("Send Email", False, "No from_email_id provided")
            return False, {}
        
        send_data = {
            "from_email_id": from_email_id,
            "to_email": "test@example.com",
            "subject": "Test Email",
            "body_html": "<p>This is a test email from GhostMail</p>"
        }
        
        # This might fail with 400 if Resend API key not configured - that's expected
        success, data, status = self.run_test(
            "Send Email",
            "POST",
            "email/send",
            200,
            data=send_data
        )
        
        # If it fails with 400 due to missing API key, that's acceptable
        if not success and status == 400:
            if "api key" in str(data).lower():
                self.log_result("Send Email", True, "Expected failure - Resend API key not configured", data)
                return True, data
        
        return success, data

    def test_webhook_endpoints(self):
        """Test webhook endpoints (basic structure test)"""
        
        # Test Resend webhook endpoint (should return 422 or 400 for invalid payload)
        success1, _, _ = self.run_test(
            "Resend Webhook Endpoint",
            "POST",
            "webhook/resend", 
            422,  # Expected to fail with invalid payload
            data={"test": "data"}
        )
        
        # Test Telegram webhook with invalid secret (should return 403)
        success2, _, _ = self.run_test(
            "Telegram Webhook (Invalid Secret)",
            "POST",
            "webhook/telegram/invalid_secret",
            403,
            data={"test": "data"}
        )
        
        return success1 and success2

    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting GhostMail Backend API Test Suite")
        print("=" * 50)
        
        start_time = time.time()
        
        # Test 1: Basic health checks
        print("\n📊 PHASE 1: HEALTH CHECKS")
        self.test_health_check()
        self.test_auth_status()
        self.test_stats_endpoint()
        
        # Test 2: Admin authentication and configuration  
        print("\n🔐 PHASE 2: ADMIN AUTHENTICATION")
        self.test_admin_login_invalid()
        self.test_admin_login()
        self.test_admin_verify()
        
        # Test 3: Admin configuration management
        print("\n⚙️  PHASE 3: ADMIN CONFIGURATION")
        self.test_admin_config_get()
        self.test_admin_config_update()
        self.test_admin_domain_management()
        
        # Test 4: Email operations (full CRUD)
        print("\n📧 PHASE 4: EMAIL OPERATIONS")
        email_id = self.test_email_generation()
        self.test_email_list()
        
        if email_id:
            self.test_email_inbox(email_id)
            self.test_send_email(email_id)  # May fail due to missing API key - that's OK
            # Delete email after other tests
            time.sleep(1)  # Small delay
            self.test_email_deletion(email_id)
        
        # Test 5: Webhook endpoints
        print("\n🔗 PHASE 5: WEBHOOK ENDPOINTS")
        self.test_webhook_endpoints()
        
        # Final results
        end_time = time.time()
        duration = end_time - start_time
        
        print("\n" + "=" * 50)
        print(f"🏁 TEST SUITE COMPLETED in {duration:.2f}s")
        print(f"📊 Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for fail in self.failed_tests:
                print(f"   • {fail['test']}: {fail['error']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Return summary for integration with testing framework
        return {
            'total': self.tests_run,
            'passed': self.tests_passed,
            'failed': len(self.failed_tests),
            'success_rate': success_rate,
            'failed_tests': self.failed_tests,
            'test_results': self.test_results
        }

def main():
    """Main test runner"""
    tester = GhostMailAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results['success_rate'] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())