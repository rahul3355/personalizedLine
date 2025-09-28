// pages/api/insights.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // service role for writes
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log("🔵 /api/insights called");

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
    }
    console.log("🟢 Received userId:", userId);

    try {
        // 0. Check if insights already exist
        const { data: existingInsights, error: insightsError } = await supabase
            .from("user_ai_insights")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (insightsError) throw insightsError;

        if (existingInsights) {
            console.log("✅ Insights already exist, skipping Moonshot:", existingInsights);
            return res.status(200).json(existingInsights);
        }

        // 1. Fetch profile (only runs if no insights exist)
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("id", userId)
            .single();


        if (profileError) throw profileError;
        console.log("✅ Profile fetched:", profile);

        // 2. Fetch core traits
        const { data: traits, error: traitsError } = await supabase
            .from("user_core_traits")
            .select("*")
            .eq("user_id", userId)
            .single();

        if (traitsError) throw traitsError;
        console.log("✅ Traits fetched:", traits);

        // 3. Build prompt
        const prompt = `
You are an insights engine. 
Given the following user profile information, return a JSON object for insertion into the "user_ai_insights" table. 

Rules:
- Always fill every key with a plausible value.
- Never output null, empty strings, or undefined.
- Make conservative estimates if uncertain.
- Output ONLY valid JSON. No text before or after.

Required keys (match exactly the user_ai_insights schema):
age (int),
gender ("male"|"female"),
attractiveness_1_10 (int 1-10),
race (string, e.g. "asian","south-asian","white","black","latino"),
income_usd (int, estimated annual income),
income_tier ("low"|"mid"|"high"),
price_sensitivity ("low"|"medium"|"high"),
tech_savviness_1_10 (int 1-10),
risk_tolerance ("low"|"medium"|"high"),
religion (string, e.g. "hindu","muslim","christian","none"),
political_leaning ("left"|"right"|"moderate"),
education_level (string, e.g. "high-school","bachelor","master","phd"),
marital_status ("single"|"married"|"divorced"),
has_kids (boolean),
home_owner (boolean),
car_owner (boolean),
credit_score_bucket ("poor"|"fair"|"good"|"excellent"),
gambling_tendency ("low"|"medium"|"high"),
shopping_style ("deal-seeker"|"impulsive"|"brand-focused"),
brand_loyalty ("low"|"medium"|"high"),
coupon_usage ("low"|"medium"|"high"),
luxury_spender (boolean),
charity_donor (boolean),
best_email_hour (int 0-23),
best_push_hour (int 0-23),
face_confidence (number 0–1, confidence score for face estimation)

User context:
Name: ${profile.full_name}
Email: ${profile.email}
Avatar: ${profile.avatar_url}
Country: ${traits.country}
City: ${traits.city}
Timezone: ${traits.timezone}
Screen width: ${traits.screen_width}
Device: ${traits.device_type}
Memory: ${traits.memory_gb}GB
`;


        console.log("📝 Prompt sent to Moonshot:\n", prompt);

        // 4. Call Moonshot API
        const moonshotRes = await fetch("https://api.moonshot.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "moonshot-v1-8k",
                temperature: 0.2,
                max_tokens: 5000, // ✅ under 8192 cap
                response_format: { type: "json_object" }, // ✅ force valid JSON
                messages: [{ role: "user", content: prompt }],
            }),
        });

        const moonshotJson = await moonshotRes.json();
        console.log("🌐 Moonshot response status:", moonshotRes.status);
        console.log("📩 Raw Moonshot response:", moonshotJson);

        if (!moonshotRes.ok) {
            throw new Error(moonshotJson?.error?.message || "Moonshot request failed");
        }

        const content = moonshotJson.choices?.[0]?.message?.content;
        if (!content) throw new Error("No content returned from Moonshot");

        const parsed = JSON.parse(content);
        console.log("✅ Parsed JSON:", parsed);

        // 5. Upsert into Supabase
        // ✅ Only keep keys that belong in user_ai_insights
        const allowedKeys = [
            "age",
            "attractiveness_1_10",
            "income_usd",
            "tech_savviness_1_10",
            "has_kids",
            "home_owner",
            "car_owner",
            "luxury_spender",
            "charity_donor",
            "best_email_hour",
            "best_push_hour",
            "face_confidence",
            "user_id",
            "shopping_style",
            "brand_loyalty",
            "gender",
            "coupon_usage",
            "race",
            "credit_score_bucket",
            "income_tier",
            "price_sensitivity",
            "gambling_tendency",
            "risk_tolerance",
            "religion",
            "political_leaning",
            "education_level",
            "marital_status",
        ];

        const filtered = Object.fromEntries(
            Object.entries(parsed.user_ai_insights || parsed)
                .filter(([key]) => allowedKeys.includes(key))
        );

        const row = { ...filtered, user_id: userId };

        console.log("✅ Final row for user_ai_insights:", row);



        const { error } = await supabase
            .from("user_ai_insights")
            .upsert(row, { onConflict: "user_id" });

        if (error) {
            console.error("❌ Upsert failed:", error);
        } else {
            console.log("✅ Row upsert succeeded:", row);
        }



        console.log("✅ Row upserted into user_ai_insights");

        return res.status(200).json(row);
    } catch (err: any) {
        console.error("💥 Handler error:", err);
        return res.status(500).json({ error: err.message });
    }
}
