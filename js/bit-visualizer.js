/* Interactive bit visualizer: type a binary number or click bits to toggle them. */
(function () {
  'use strict';
  if (typeof document === 'undefined') return;
  var MAX_BITS = 16;

  document.addEventListener('DOMContentLoaded', function () {
    var input = document.getElementById('viz-input'), box = document.getElementById('viz-bits'),
        total = document.getElementById('viz-total'), msg = document.getElementById('viz-msg');
    var bits = [];

    function line(parent, text) { var d = document.createElement('div'); d.textContent = text; parent.appendChild(d); }

    /** Redraws all bit columns and the decimal total from the `bits` array (left to right). */
    function render() {
      box.replaceChildren();
      var sum = 0, n = bits.length;
      bits.forEach(function (b, i) {
        var power = n - 1 - i, place = Math.pow(2, power), share = b ? place : 0;
        sum += share;
        var col = document.createElement('div'); col.className = 'bitcol';
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'bit ' + (b ? 'on' : 'off'); btn.textContent = b;
        btn.setAttribute('aria-label', 'بیت با ارزش مکانی ' + place + '، مقدار فعلی ' + b + '؛ برای تغییر کلیک کنید');
        btn.addEventListener('click', function () { bits[i] = b ? 0 : 1; input.value = bits.join(''); render(); });
        col.appendChild(btn);
        line(col, '2^' + power); line(col, 'ارزش: ' + place); line(col, 'سهم: ' + share);
        box.appendChild(col);
      });
      total.textContent = bits.join('') + '₂ = ' + sum + '₁₀';
    }

    /** Reads the text input; invalid input shows an error and keeps the last valid bits. */
    function readInput() {
      var v = window.BinaryLib.validateBinary(input.value, MAX_BITS);
      if (!v.ok) { msg.textContent = v.error; return; }
      msg.textContent = '';
      bits = v.value.split('').map(Number); render();
    }
    input.addEventListener('input', readInput);
    readInput();
  });
})();
