/** Google Tag Manager container — shared install snippet for App Router + static play HTML. */
export const GTM_CONTAINER_ID = "GTM-PB65KQCT";

/** Head script Google Tag Assistant expects (pushes gtm.start before loading gtm.js). */
export const GTM_HEAD_SCRIPT = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');`;

export const GTM_NOSCRIPT_IFRAME_SRC = `https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`;