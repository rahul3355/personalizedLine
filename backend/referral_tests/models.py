from pydantic import BaseModel

class Referral(BaseModel):
    referrer_id: str
    referred_id: str
    status: str
