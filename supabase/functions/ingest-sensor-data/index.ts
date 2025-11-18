import "https://deno.land/x/xhr@0.4.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser/Fly callers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^sha256=/i, "").trim();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
}

async function hmacSha256Hex(secret: string, data: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, data.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function coerceWiFi(list: any[] | undefined) {
  if (!Array.isArray(list)) return [] as any[];
  return list
    .map((w) => ({
      mac: w.mac || w.macAddress || w.bssid || w.BSSID || w.address,
      ssid: w.ssid,
      signalStrength: w.rssi || w.signal || w.signalStrength,
    }))
    .filter((w) => typeof w.mac === "string");
}

function coerceCells(list: any[] | undefined) {
  if (!Array.isArray(list)) return [] as any[];
  return list
    .map((c) => ({
      mcc: c.mcc ?? c.MCC,
      mnc: c.mnc ?? c.MNC,
      lac: c.lac ?? c.tac ?? c.LAC ?? c.TAC,
      cid: c.cid ?? c.cellId ?? c.CID,
      signalStrength: c.rssi || c.signal || c.signalStrength,
      radioType: c.radio || c.radioType,
    }))
    .filter((c) => c.mcc != null && c.mnc != null && c.cid != null);
}

function pickGNSS(gnss: any | undefined) {
  if (!gnss) return null;
  const lat = gnss.lat ?? gnss.latitude;
  const lng = gnss.lng ?? gnss.lon ?? gnss.longitude;
  const accuracy = gnss.accuracy ?? gnss.hdop ?? gnss.precision;
  if (typeof lat === "number" && typeof lng === "number") {
    return { lat, lng, accuracy: typeof accuracy === "number" ? accuracy : undefined };
  }
  return null;
}

async function locateViaHere(apiKey: string, wlan: any[], cell: any[]) {
  const body = { wlan, cell };
  const res = await fetch(`https://positioning.hereapi.com/v2/locate?apiKey=${apiKey}` , {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("HERE error", res.status, json);
    throw new Error(`HERE ${res.status}`);
  }
  // Accept either {location:{lat, lng, accuracy}} or {position:{lat, lng, accuracy}}
  const loc = json.location || json.position || json;
  const lat = loc.lat ?? loc.latitude;
  const lng = loc.lng ?? loc.lon ?? loc.longitude;
  const accuracy = loc.accuracy ?? loc.hpe ?? loc.score;
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("HERE response missing coordinates");
  }
  return { lat, lng, accuracy: typeof accuracy === "number" ? accuracy : undefined, source: "here" as const };
}

async function computeInputsHash(obj: unknown): Promise<string> {
  const enc = new TextEncoder().encode(JSON.stringify(obj));
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

serve(async (req) => {
  try {
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const HERE_API_KEY = Deno.env.get("HERE_API_KEY");
    const FLY_INGEST_SECRET = Deno.env.get("FLY_INGEST_SECRET");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !HERE_API_KEY || !FLY_INGEST_SECRET) {
      console.error("Missing required secrets or env");
      return new Response(JSON.stringify({ error: "Server not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const raw = await req.text();
    const bodyBytes = new TextEncoder().encode(raw);

    // Verify HMAC signature
    const sigHeader = req.headers.get("x-signature") || "";
    const expected = await hmacSha256Hex(FLY_INGEST_SECRET, bodyBytes);
    const providedBytes = hexToBytes(sigHeader);
    const expectedBytes = hexToBytes(expected);
    // @ts-ignore timingSafeEqual available in Deno deploy
    const valid = providedBytes.length === expectedBytes.length && (
      typeof crypto.subtle.timingSafeEqual === 'function'
        ? crypto.subtle.timingSafeEqual(providedBytes, expectedBytes)
        : providedBytes.every((b, i) => b === expectedBytes[i])
    );

    if (!valid) {
      console.warn("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let payload: any;
    try { payload = JSON.parse(raw); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const devid: string | undefined = payload.devid || payload.deviceId || payload.device_id;
    if (!devid) {
      return new Response(JSON.stringify({ error: "Missing devid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const wlan = coerceWiFi(payload.wifi || payload.wlan || payload.wifiAccessPoints);
    const cell = coerceCells(payload.cells || payload.cell || payload.cellTowers);
    const gnss = pickGNSS(payload.gnss || payload.gps || payload.location);

    let fix: { lat: number; lng: number; accuracy?: number; source: "gnss" | "here" } | null = null;
    if (gnss) {
      fix = { ...gnss, source: "gnss" } as any;
    } else if (wlan.length || cell.length) {
      fix = await locateViaHere(HERE_API_KEY, wlan, cell);
    } else {
      return new Response(JSON.stringify({ error: "No positioning inputs provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inputsHash = await computeInputsHash({ wlan, cell, gnss });
    const ts = typeof payload.timestamp === "number" ? new Date(payload.timestamp * 1000).toISOString() : new Date().toISOString();

    // Ensure fix is not null before using
    if (!fix) {
      return new Response(JSON.stringify({ error: "Failed to determine location" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const insert = {
      devid,
      data_type: "location",
      uplink_count: payload.uplink_count ?? null,
      data: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, source: fix.source, inputsHash, ts },
    } as const;

    const { data, error } = await supabase.from("sensor_data").insert(insert).select("id, created_at").single();
    if (error) {
      console.error("Insert error", error);
      return new Response(JSON.stringify({ error: "DB insert failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true, id: data?.id, created_at: data?.created_at, devid, fix }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unhandled error", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
