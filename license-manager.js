/**
 * Fire Executive Pro - License Manager
 * نسخه: 1.0.0
 */

const LicenseManager = (() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // 🔑 Public Key (اینجا را با Public Key خود جایگزین کنید)
  // ═══════════════════════════════════════════════════════════
  const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv4S0emK6yCWsVYdByYIh
7UsBp087QryzGBhw5B4uam2185r5Y2yDEjiak5EyJVgXLC5ylK39FVSaakRPrpaA
JXwUjF+tUAFcFgIh7ZVYd60GHfZTj08l1M+i9vbc7PX3n5RHjsMCT41id8MZIGcl
IwNJSnsyDMUZpnYNMlrl+8dUlO9P70EA+BCBxNsz+Z+ukqtf/lSgkAr7Qhg5pUdx
VpT4RJ9ND8wWAFQKZGKcKiI6orYlpsgH5JBAlv94U+URcc6+Z9us5UAzwN+m0/Zh
2trnS5oAbIKsBr1SI2R7JLvos27VTTqlL/vkiVZu+ks5x6q+Nd5kcS0hAD6n16MP
RQIDAQAB

-----END PUBLIC KEY-----`;
  // ↑↑↑ Public Key خود را اینجا Paste کنید ↑↑↑

  // ═══════════════════════════════════════════════════════════
  // تولید Device ID
  // ══════════════════════════════════════════════════════════
  async function generateDeviceID() {
    const sources = {
      ua: navigator.userAgent,
      lang: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    
    const raw = JSON.stringify(sources);
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.match(/.{1,4}/g).slice(0, 4).join('-').toUpperCase();
  }

  // ═══════════════════════════════════════════════════════════
  // اعتبارسنجی لایسنس
  // ═══════════════════════════════════════════════════════════
  async function verifyLicense(licenseData) {
    try {
      const pemContents = PUBLIC_KEY_PEM
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/\s/g, '');
      
      const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
      
      const publicKey = await crypto.subtle.importKey(
        'spki',
        binaryDer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        true,
        ['verify']
      );
      
      const payload = { ...licenseData };
      delete payload.signature;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));
      const signature = Uint8Array.from(atob(licenseData.signature), c => c.charCodeAt(0));
      
      const isValid = await crypto.subtle.verify(
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        publicKey,
        signature,
        data
      );
      
      const now = new Date();
      const expiresAt = new Date(licenseData.dates.expiresAt);
      const isExpired = now > expiresAt;
      
      return {
        valid: isValid && !isExpired,
        plan: licenseData.plan,
        expiresAt: licenseData.dates.expiresAt,
        deviceId: licenseData.deviceId
      };
      
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ذخیره‌سازی
  // ═══════════════════════════════════════════════════════════
  const STORAGE_KEY = 'fep_license_v1';

  function saveLicense(licenseData) {
    localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(licenseData)));
  }

  function loadLicense() {
    const encoded = localStorage.getItem(STORAGE_KEY);
    if (!encoded) return null;
    try {
      return JSON.parse(atob(encoded));
    } catch (e) {
      return null;
    }
  }

  function clearLicense() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ═══════════════════════════════════════════════════════════
  // API عمومی
  // ═══════════════════════════════════════════════════════════
  return {
    generateDeviceID,
    verifyLicense,
    saveLicense,
    loadLicense,
    clearLicense,
    
    async checkStatus() {
      const license = loadLicense();
      if (!license) {
        return { status: 'free', deviceId: await generateDeviceID() };
      }
      
      const result = await verifyLicense(license);
      if (result.valid) {
        return { 
          status: 'active',
          plan: result.plan,
          expiresAt: result.expiresAt,
          deviceId: result.deviceId
        };
      } else {
        return { 
          status: 'invalid',
          deviceId: await generateDeviceID()
        };
      }
    }
  };
})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LicenseManager;
}
