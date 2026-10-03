export interface Faq {
  q: string;
  a: string;
  home?: boolean;
}

// Las marcadas con `home` aparecen en la página de inicio; todas aparecen en /preguntas-frecuentes.html.
export const FAQS: Faq[] = [
  {
    q: '¿Esto es confiable o es otra rifa más?',
    a: 'El ganador no lo elegimos nosotros: sale de la lotería oficial del día, que cualquiera puede consultar. Y cada pago se publica en el grupo.',
    home: true,
  },
  {
    q: '¿Cuánto cuesta entrar?',
    a: 'Nada. Entrar al grupo es gratis. Habrá dinámicas gratis y otras de bajo costo, y el valor se anuncia antes de participar.',
    home: true,
  },
  {
    q: '¿Cuándo es el primer sorteo?',
    a: 'Muy pronto. La fecha se anuncia primero en el grupo oficial de WhatsApp.',
    home: true,
  },
  {
    q: 'Si gano, ¿cómo me pagan?',
    a: 'Te escribimos por WhatsApp, te transferimos el premio y publicamos el comprobante en el grupo.',
    home: true,
  },
  {
    q: '¿Cómo participo?',
    a: 'Entra gratis al grupo oficial de WhatsApp. Ahí se publica cada dinámica con sus reglas, su valor y la lotería con la que se juega.',
  },
  {
    q: '¿Cómo se define el número ganador?',
    a: 'Con el resultado de la lotería oficial del día que indique cada dinámica. De ese número salen los ganadores, por ejemplo con las dos últimas, las dos primeras o las dos cifras del medio.',
  },
  {
    q: '¿Cada cuánto habrá sorteos?',
    a: 'Habrá dinámicas diarias y semanales con distintos montos en efectivo. El calendario se publicará en el grupo.',
  },
  {
    q: '¿Puedo participar desde cualquier ciudad?',
    a: 'Sí. Todo ocurre por WhatsApp, así que puedes participar desde cualquier ciudad o municipio de Colombia. Debes ser mayor de edad.',
  },
  {
    q: '¿Dónde están los términos y condiciones?',
    a: 'En la página de términos y condiciones, enlazada en el menú y en el pie de página.',
  },
];
