"""
MetadataExtractionService — extracts structured fields from document text.

Category-aware: the fields it extracts depend on what category was detected.
Returns a dict (stored as JSONB) with null for unavailable fields.
"""

import json
import logging
from typing import Any, Dict, Optional

from app.ai.base import AIProvider

logger = logging.getLogger(__name__)

# Category-specific field schemas sent to the AI
_FIELD_SCHEMAS: Dict[str, Dict[str, str]] = {
    "Resume": {
        "candidate_name": "Full name of the candidate",
        "email": "Email address",
        "phone": "Phone number",
        "skills": "List of key skills (comma-separated)",
        "years_of_experience": "Approximate years of experience",
        "current_company": "Most recent employer",
    },
    "Invoice": {
        "vendor_name": "Company or person issuing the invoice",
        "invoice_number": "Invoice ID or number",
        "invoice_date": "Date on the invoice (YYYY-MM-DD)",
        "due_date": "Payment due date (YYYY-MM-DD or null)",
        "total_amount": "Total amount due (number only)",
        "currency": "Currency code (e.g. INR, USD)",
    },
    "Receipt": {
        "vendor_name": "Store or business name",
        "date": "Transaction date (YYYY-MM-DD)",
        "total_amount": "Total paid",
        "payment_method": "Cash / Card / UPI / etc.",
    },
    "Passport": {
        "full_name": "Passport holder full name",
        "passport_number": "Passport number",
        "nationality": "Nationality",
        "date_of_birth": "Date of birth (YYYY-MM-DD)",
        "issue_date": "Issue date (YYYY-MM-DD)",
        "expiry_date": "Expiry date (YYYY-MM-DD)",
    },
    "Driving License": {
        "full_name": "License holder name",
        "license_number": "DL number",
        "date_of_birth": "DOB (YYYY-MM-DD)",
        "issue_date": "Issue date",
        "expiry_date": "Expiry date",
        "vehicle_class": "Vehicle class(es)",
    },
    "PAN Card": {
        "full_name": "Name on card",
        "pan_number": "PAN number",
        "father_name": "Father's name",
        "date_of_birth": "DOB (YYYY-MM-DD)",
    },
    "Aadhaar": {
        "full_name": "Name on card",
        "aadhaar_number": "Last 4 digits only (for privacy)",
        "date_of_birth": "DOB",
        "gender": "Gender",
    },
    "Bank Statement": {
        "bank_name": "Bank name",
        "account_holder": "Account holder name",
        "account_number": "Masked account number",
        "statement_period": "e.g. Jan 2024 – Mar 2024",
        "closing_balance": "Closing balance amount",
    },
    "Certificate": {
        "issuer": "Issuing organisation",
        "recipient_name": "Recipient name",
        "course_or_award": "Course, award, or achievement",
        "completion_date": "Date of completion (YYYY-MM-DD)",
        "certificate_number": "Certificate ID if present",
    },
    "Insurance": {
        "policy_number": "Policy number",
        "insurer": "Insurance company",
        "insured_name": "Policyholder name",
        "start_date": "Policy start date",
        "end_date": "Policy end date",
        "premium_amount": "Premium amount",
        "coverage_type": "Type of coverage",
    },
    "Tax Document": {
        "taxpayer_name": "Name of taxpayer",
        "tax_year": "Assessment or financial year",
        "total_income": "Total income",
        "tax_paid": "Tax paid",
        "pan_number": "PAN number if present",
    },
    "Employment Letter": {
        "employee_name": "Employee full name",
        "employer": "Company name",
        "designation": "Job title",
        "joining_date": "Date of joining (YYYY-MM-DD)",
        "salary": "Salary if mentioned",
    },
    "Offer Letter": {
        "candidate_name": "Candidate name",
        "company": "Company name",
        "designation": "Offered role",
        "ctc": "CTC or salary package",
        "joining_date": "Expected joining date",
    },
    "Medical Report": {
        "patient_name": "Patient name",
        "doctor_name": "Doctor or hospital",
        "report_date": "Date of report",
        "diagnosis": "Primary diagnosis or findings",
    },
    "College Document": {
        "student_name": "Student name",
        "institution": "College or university",
        "course": "Programme / degree",
        "year": "Academic year or graduation year",
    },
    "Rental Agreement": {
        "landlord_name": "Landlord name",
        "tenant_name": "Tenant name",
        "property_address": "Property address",
        "rent_amount": "Monthly rent",
        "start_date": "Agreement start date",
        "end_date": "Agreement end date",
    },
    "Electricity Bill": {
        "consumer_name": "Consumer name",
        "consumer_number": "Consumer / account number",
        "billing_period": "Billing period",
        "units_consumed": "Units consumed (kWh)",
        "amount_due": "Total amount due",
        "due_date": "Payment due date",
    },
    "Water Bill": {
        "consumer_name": "Consumer name",
        "billing_period": "Billing period",
        "amount_due": "Total amount due",
        "due_date": "Payment due date",
    },
    "Gas Bill": {
        "consumer_name": "Consumer name",
        "billing_period": "Billing period",
        "units_consumed": "Units consumed",
        "amount_due": "Total amount due",
    },
}

_GENERIC_FIELDS = {
    "document_title": "Document title or heading if any",
    "date": "Most relevant date in the document",
    "issuing_entity": "Organisation or person who issued the document",
}

_PROMPT_TEMPLATE = """\
You are a document data extraction expert.

Document category: {category}
Document text (first 3000 characters):
{text}

Extract the following fields. Return valid JSON only — no explanation, no markdown.
Use null for any field that cannot be determined from the text. Do not guess.

Fields to extract:
{fields_json}
"""


class MetadataExtractionService:
    """
    Extracts structured metadata from document text.
    Field schema is chosen based on the document category.
    """

    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    async def extract(self, text: str, category: str) -> Optional[Dict[str, Any]]:
        """
        Extract metadata fields appropriate for the given category.
        Returns a dict or None on failure.
        """
        schema = _FIELD_SCHEMAS.get(category, _GENERIC_FIELDS)
        truncated = text[:3000]

        prompt = _PROMPT_TEMPLATE.format(
            category=category,
            text=truncated,
            fields_json=json.dumps(schema, indent=2),
        )

        try:
            raw = await self.provider.generate(prompt, json_mode=True)
            data = json.loads(raw)
            # Strip null values for cleaner storage
            return {k: v for k, v in data.items() if v is not None and v != ""}
        except Exception as exc:
            logger.error("Metadata extraction failed for category %r: %s", category, exc)
            return None
