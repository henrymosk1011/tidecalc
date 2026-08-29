var CATALOG = {
  bac: { sku: "BA10", name: "Bacteriostatic Water", mlPerVial: 10, lotVials: 10, lotPrice: 12 },
  peptides: [
    {
      id: "tirzepatide",
      name: "Tirzepatide",
      defaultDoseMg: 5,
      defaultFreq: "weekly",
      defaultReconMl: 2,
      defaultSku: "TR10",
      skus: [
        { sku: "TR5", mgPerVial: 5, lotVials: 10, lotPrice: 35 },
        { sku: "TR10", mgPerVial: 10, lotVials: 10, lotPrice: 50 },
        { sku: "TR15", mgPerVial: 15, lotVials: 10, lotPrice: 70 },
        { sku: "TR20", mgPerVial: 20, lotVials: 10, lotPrice: 95 },
        { sku: "TR30", mgPerVial: 30, lotVials: 10, lotPrice: 128 },
        { sku: "TR40", mgPerVial: 40, lotVials: 10, lotPrice: 165 },
        { sku: "TR45", mgPerVial: 45, lotVials: 10, lotPrice: 185 },
        { sku: "TR50", mgPerVial: 50, lotVials: 10, lotPrice: 200 },
        { sku: "TR60", mgPerVial: 60, lotVials: 10, lotPrice: 220 }
      ]
    },
    {
      id: "retatrutide",
      name: "Retatrutide",
      defaultDoseMg: 5,
      defaultFreq: "weekly",
      defaultReconMl: 2,
      defaultSku: "RT10",
      skus: [
        { sku: "RT5", mgPerVial: 5, lotVials: 10, lotPrice: 80 },
        { sku: "RT10", mgPerVial: 10, lotVials: 10, lotPrice: 90 },
        { sku: "RT15", mgPerVial: 15, lotVials: 10, lotPrice: 110 },
        { sku: "RT20", mgPerVial: 20, lotVials: 10, lotPrice: 145 },
        { sku: "RT30", mgPerVial: 30, lotVials: 10, lotPrice: 190 },
        { sku: "RT50", mgPerVial: 50, lotVials: 10, lotPrice: 320 }
      ]
    },
    {
      id: "dsip",
      name: "DSIP",
      defaultDoseMg: 0.2,
      defaultFreq: "daily",
      defaultReconMl: 2,
      defaultSku: "DS5",
      skus: [
        { sku: "DS2", mgPerVial: 2, lotVials: 10, lotPrice: 20 },
        { sku: "DS5", mgPerVial: 5, lotVials: 10, lotPrice: 40 },
        { sku: "DS15", mgPerVial: 15, lotVials: 10, lotPrice: 108 }
      ]
    }
  ]
};
