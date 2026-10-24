// Recursos da página de artigo do blog: barra de progresso da leitura,
// botão "copiar link" e destaque do item do sumário que está na tela.
(function () {
  var barra = document.getElementById('progresso-leitura');
  var artigo = document.querySelector('.prose-girassol');

  if (barra && artigo) {
    var atualizar = function () {
      var inicio = artigo.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
      var fim = inicio + artigo.offsetHeight - window.innerHeight * 0.4;
      var progresso = Math.min(1, Math.max(0, (window.scrollY - inicio) / Math.max(1, fim - inicio)));
      barra.style.transform = 'scaleX(' + progresso + ')';
    };
    window.addEventListener('scroll', atualizar, { passive: true });
    window.addEventListener('resize', atualizar);
    atualizar();
  }

  document.querySelectorAll('[data-copiar-link]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      var url = botao.getAttribute('data-copiar-link');
      var feito = function () {
        var icone = botao.querySelector('iconify-icon');
        botao.setAttribute('aria-label', 'Link copiado!');
        botao.classList.add('copiado');
        if (icone) icone.setAttribute('icon', 'solar:check-circle-linear');
        setTimeout(function () {
          botao.setAttribute('aria-label', 'Copiar link do artigo');
          botao.classList.remove('copiado');
          if (icone) icone.setAttribute('icon', 'solar:link-linear');
        }, 2000);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(feito, function () {});
    });
  });

  var links = document.querySelectorAll('#sumario [data-sumario-link]');
  if (links.length && 'IntersectionObserver' in window) {
    var porId = {};
    links.forEach(function (a) {
      porId[a.getAttribute('href').slice(1)] = a;
    });
    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          links.forEach(function (a) {
            a.removeAttribute('aria-current');
          });
          var ativo = porId[entrada.target.id];
          if (ativo) ativo.setAttribute('aria-current', 'true');
        });
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );
    document.querySelectorAll('.prose-girassol h2[id], .prose-girassol h3[id]').forEach(function (h) {
      observador.observe(h);
    });
  }
})();
