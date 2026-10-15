/* Converter logic (pure, testable) + UI wiring for the two converters and the division stepper. */
(function (root) {
  'use strict';
  var MAX_BITS = 64, MAX_DECIMAL_DIGITS = 18;

  /** Converts Persian/Arabic-Indic digits to Latin digits and trims spaces. */
  function normalizeDigits(text) {
    return String(text).trim()
      .replace(/[\u06F0-\u06F9]/g, function (d) { return d.charCodeAt(0) - 0x06F0; })
      .replace(/[\u0660-\u0669]/g, function (d) { return d.charCodeAt(0) - 0x0660; });
  }

  /** Validates a binary string. Returns {ok, error, value}. */
  function validateBinary(raw, maxBits) {
    var s = normalizeDigits(raw), limit = maxBits || MAX_BITS;
    if (s === '') return { ok: false, error: 'لطفاً یک عدد دودویی وارد کنید.' };
    if (!/^[01]+$/.test(s)) return { ok: false, error: 'فقط ارقام ۰ و ۱ مجاز هستند (بدون علامت منفی، اعشار یا حروف).' };
    if (s.length > limit) return { ok: false, error: 'حداکثر ' + limit + ' بیت مجاز است.' };
    return { ok: true, value: s };
  }

  /** Binary string -> decimal string, with per-bit breakdown. */
  function binaryToDecimal(bin) {
    var terms = [], n = bin.length;
    for (var i = 0; i < n; i++) {
      var power = n - 1 - i, bit = bin[i];
      var place = (1n << BigInt(power));
      terms.push({ bit: bit, power: power, place: place.toString(), contribution: bit === '1' ? place.toString() : '0' });
    }
    // parseInt is exact up to 53 bits; BigInt covers the rest.
    var value = n <= 53 ? String(parseInt(bin, 2)) : BigInt('0b' + bin).toString();
    return { value: value, terms: terms };
  }

  /** Validates a non-negative decimal integer string. */
  function validateDecimal(raw) {
    var s = normalizeDigits(raw);
    if (s === '') return { ok: false, error: 'لطفاً یک عدد وارد کنید.' };
    if (s[0] === '-') return { ok: false, error: 'عدد منفی پشتیبانی نمی‌شود؛ فقط عدد صحیح نامنفی وارد کنید.' };
    if (/[.,٫]/.test(s)) return { ok: false, error: 'عدد اعشاری پشتیبانی نمی‌شود؛ فقط عدد صحیح وارد کنید.' };
    if (!/^\d+$/.test(s)) return { ok: false, error: 'فقط ارقام ۰ تا ۹ مجاز هستند.' };
    if (s.replace(/^0+(?=\d)/, '').length > MAX_DECIMAL_DIGITS) return { ok: false, error: 'حداکثر ' + MAX_DECIMAL_DIGITS + ' رقم مجاز است.' };
    return { ok: true, value: s };
  }

  /** Decimal string -> binary string via repeated division by 2 (BigInt). */
  function decimalToBinary(dec) {
    var n = BigInt(dec), steps = [];
    if (n === 0n) return { binary: '0', steps: [{ dividend: '0', quotient: '0', remainder: '0' }] };
    var bits = '';
    while (n > 0n) {
      var q = n / 2n, r = n % 2n;
      steps.push({ dividend: n.toString(), quotient: q.toString(), remainder: r.toString() });
      bits = r.toString() + bits;
      n = q;
    }
    return { binary: bits, steps: steps };
  }

  var api = { normalizeDigits: normalizeDigits, validateBinary: validateBinary, binaryToDecimal: binaryToDecimal,
              validateDecimal: validateDecimal, decimalToBinary: decimalToBinary };
  root.BinaryLib = api;
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof document === 'undefined') return;

  /* ---------- DOM helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function cell(tr, text) { var td = document.createElement('td'); td.textContent = text; tr.appendChild(td); }
  function addDivisionRow(tbody, s) {
    var tr = document.createElement('tr');
    cell(tr, s.dividend + ' ÷ 2'); cell(tr, s.quotient); cell(tr, s.remainder);
    tbody.appendChild(tr);
  }

  /** Copies text with Clipboard API; falls back to execCommand. Calls done(success). */
  function copyText(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); done(ok);
  }
  root.BinaryLib.copyText = copyText;

  function wireCopy(btn, getText, msg) {
    btn.addEventListener('click', function () {
      copyText(getText(), function (ok) {
        msg.className = ok ? 'msg ok' : 'msg';
        msg.textContent = ok ? 'نتیجه کپی شد.' : 'کپی خودکار ممکن نشد؛ نتیجه را دستی انتخاب و کپی کنید.';
      });
    });
  }

  /* ---------- Binary -> decimal tool ---------- */
  function initB2d() {
    var input = $('b2d-input'), msg = $('b2d-msg'), res = $('b2d-result'), table = $('b2d-table'),
        formula = $('b2d-formula'), copy = $('b2d-copy'), tbody = table.querySelector('tbody');
    function clearOutput() { res.textContent = ''; formula.textContent = ''; table.hidden = true; tbody.replaceChildren(); copy.disabled = true; }
    function update() {
      msg.className = 'msg'; clearOutput();
      if (input.value.trim() === '') { msg.textContent = ''; return; }
      var v = validateBinary(input.value);
      if (!v.ok) { msg.textContent = v.error; return; }
      var r = binaryToDecimal(v.value), parts = [], sum = [];
      r.terms.forEach(function (t) {
        var tr = document.createElement('tr');
        cell(tr, t.bit); cell(tr, '2^' + t.power); cell(tr, t.place); cell(tr, t.contribution);
        tbody.appendChild(tr);
        parts.push(t.bit + '×' + t.place);
        if (t.bit === '1') sum.push(t.place);
      });
      table.hidden = false;
      res.textContent = r.value;
      formula.textContent = v.value + '₂ = ' + parts.join(' + ') + (sum.length ? ' = ' + sum.join(' + ') : '') + ' = ' + r.value + '₁₀';
      copy.disabled = false;
    }
    input.addEventListener('input', update);
    $('b2d-clear').addEventListener('click', function () { input.value = ''; update(); input.focus(); });
    wireCopy(copy, function () { return res.textContent; }, msg);
  }

  /* ---------- Decimal -> binary tool ---------- */
  function initD2b() {
    var input = $('d2b-input'), msg = $('d2b-msg'), res = $('d2b-result'), table = $('d2b-table'),
        copy = $('d2b-copy'), tbody = table.querySelector('tbody');
    function update() {
      msg.className = 'msg'; res.textContent = ''; table.hidden = true; tbody.replaceChildren(); copy.disabled = true;
      if (input.value.trim() === '') { msg.textContent = ''; return; }
      var v = validateDecimal(input.value);
      if (!v.ok) { msg.textContent = v.error; return; }
      var r = decimalToBinary(v.value);
      r.steps.forEach(function (s) { addDivisionRow(tbody, s); });
      table.hidden = false;
      res.textContent = r.binary;
      msg.textContent = 'باقی‌مانده‌ها را از پایین به بالا بخوانید.'; msg.className = 'msg ok';
      copy.disabled = false;
    }
    input.addEventListener('input', update);
    $('d2b-clear').addEventListener('click', function () { input.value = ''; update(); input.focus(); });
    wireCopy(copy, function () { return res.textContent; }, msg);
  }

  /* ---------- Step-by-step division demo ---------- */
  function initStepper() {
    var input = $('step-input'), start = $('step-start'), next = $('step-next'), msg = $('step-msg'),
        table = $('step-table'), result = $('step-result'), tbody = table.querySelector('tbody'), data = null, shown = 0;
    function reset() { tbody.replaceChildren(); table.hidden = true; result.hidden = true; next.disabled = true; data = null; shown = 0; }
    start.addEventListener('click', function () {
      reset(); msg.className = 'msg';
      var v = validateDecimal(input.value);
      if (!v.ok) { msg.textContent = v.error; return; }
      data = decimalToBinary(v.value); table.hidden = false; next.disabled = false;
      msg.className = 'msg ok'; msg.textContent = 'برای دیدن هر تقسیم، «مرحله بعد» را بزنید.';
    });
    next.addEventListener('click', function () {
      if (!data || shown >= data.steps.length) return;
      addDivisionRow(tbody, data.steps[shown++]);
      if (shown === data.steps.length) {
        next.disabled = true; result.hidden = false;
        result.textContent = 'خواندن باقی‌مانده‌ها از پایین به بالا: ' + data.binary;
        msg.textContent = 'تمام شد. خارج‌قسمت به صفر رسید.';
      }
    });
    input.addEventListener('input', reset);
  }

  document.addEventListener('DOMContentLoaded', function () { initB2d(); initD2b(); initStepper(); });
})(typeof window !== 'undefined' ? window : globalThis);
