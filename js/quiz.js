/* Random quiz: 4 question types, answer always among 4 unique options. */
(function (root) {
  'use strict';
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function bin(n) { return n.toString(2); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rand(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /** Builds 4 unique options containing `answer`, drawing distractors from `candidates`. */
  function makeOptions(answer, candidates) {
    var set = [String(answer)];
    shuffle(candidates.slice()).forEach(function (c) { c = String(c); if (set.length < 4 && set.indexOf(c) < 0) set.push(c); });
    return shuffle(set);
  }

  var generators = [
    function binaryToDecimalQ() {
      var n = rand(2, 31), b = bin(n), bits = b.split('');
      var maybe = [n + 1, n - 1, n + 2, n - 2, n * 2, parseInt(bits.slice().reverse().join(''), 2), bits.filter(function (x) { return x === '1'; }).length]
        .filter(function (x) { return x >= 0 && x !== n; });
      return { key: 'b2d' + n, text: 'مقدار ده‌دهی عدد دودویی ' + b + ' کدام است؟', answer: String(n), options: makeOptions(n, maybe.concat([n + 3, n + 4])),
        explain: b + ' = ' + bits.map(function (x, i) { return x + '×' + Math.pow(2, bits.length - 1 - i); }).join(' + ') + ' = ' + n };
    },
    function decimalToBinaryQ() {
      var n = rand(2, 31), b = bin(n), r = [], q = n;
      while (q > 0) { r.push(q % 2); q = Math.floor(q / 2); }
      var cands = [bin(n + 1), bin(n - 1), bin(n + 2), b.split('').reverse().join(''), bin(n ^ 1), bin(n ^ 2)].filter(function (x) { return x !== b; });
      return { key: 'd2b' + n, text: 'عدد ' + n + ' در مبنای ۲ کدام است؟', answer: b, options: makeOptions(b, cands),
        explain: 'تقسیم‌های متوالی بر ۲ باقی‌مانده‌های ' + r.join('، ') + ' می‌دهند. از پایین به بالا: ' + b };
    },
    function bitValueQ() {
      var k = rand(0, 5), b = '1';
      for (var i = 0; i < 5; i++) b += rand(0, 1);
      b = b.split(''); b[5 - k] = '1'; b = b.join('');
      var v = Math.pow(2, k);
      return { key: 'bit' + b + k, text: 'در عدد دودویی ' + b + '، سهم بیت ۱ شمارهٔ ' + k + ' (شماره‌گذاری از راست و از صفر) چند است؟', answer: String(v),
        options: makeOptions(v, [1, 2, 4, 8, 16, 32, 64].filter(function (x) { return x !== v; })),
        explain: 'بیت شمارهٔ ' + k + ' ارزش مکانی 2^' + k + ' = ' + v + ' دارد و چون ۱ است، سهمش ' + v + ' است.' };
    },
    function placeValueQ() {
      var k = rand(1, 7), v = Math.pow(2, k);
      return { key: 'pv' + k, text: 'ارزش مکانی بیتی که توان ۲ آن ' + k + ' است چند است؟', answer: String(v),
        options: makeOptions(v, [k * 2, k + 2, v * 2, v / 2, k * k, 10 * k].filter(function (x) { return x !== v && x >= 1; })),
        explain: '۲ به توان ' + k + ' برابر ' + v + ' است.' };
    }
  ];

  /** Generates a question of a random type, avoiding the previous one. */
  function generateQuestion(prevKey) {
    var q; do { q = generators[rand(0, generators.length - 1)](); } while (q.key === prevKey);
    return q;
  }
  root.BinaryQuiz = { generateQuestion: generateQuestion };
  if (typeof module !== 'undefined') module.exports = root.BinaryQuiz;
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var $ = function (id) { return document.getElementById(id); };
    var qEl = $('quiz-question'), optEl = $('quiz-options'), fb = $('quiz-feedback'), next = $('quiz-next');
    var current = null, answered = false, score = 0, correct = 0, total = 0;

    function showScore() { $('quiz-score').textContent = score; $('quiz-correct').textContent = correct; $('quiz-total').textContent = total; }
    function load() {
      current = generateQuestion(current && current.key); answered = false;
      qEl.textContent = current.text; fb.textContent = ''; fb.className = 'msg'; next.disabled = true; optEl.replaceChildren();
      current.options.forEach(function (opt) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.dir = 'ltr'; b.textContent = opt;
        b.addEventListener('click', function () { choose(b, opt); }); optEl.appendChild(b);
      });
    }
    function choose(btn, opt) {
      if (answered) return; answered = true; total++;
      var ok = opt === current.answer;
      if (ok) { correct++; score += 10; }
      Array.prototype.forEach.call(optEl.children, function (b) { b.disabled = true; if (b.textContent === current.answer) b.classList.add('right'); });
      if (!ok) btn.classList.add('wrong');
      fb.className = ok ? 'msg ok' : 'msg';
      fb.textContent = ok ? 'درست است! ' + current.explain : 'نادرست. پاسخ درست: ' + current.answer + '. ' + current.explain;
      next.disabled = false; showScore();
    }
    next.addEventListener('click', load);
    $('quiz-restart').addEventListener('click', function () { score = correct = total = 0; current = null; showScore(); load(); });
    showScore(); load();
  });
})(typeof window !== 'undefined' ? window : globalThis);
