// Example networks shown in the editor.

export interface Example {
  id: string;
  name: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  { id: 'brain', name: 'Simplified brain', source: `// same layered column reused for every cortical area
template CorticalArea(n) {
  in  ff[n]        // from lower areas
  in  fb[n]        // from higher areas
  out up[n]        // to higher areas
  out down[n]      // back down / to thalamus

  section L4  { in x  out y }
  section L23 { in x  out y }
  section L5  { in x  out y }
  section L6  { in x  out y }

  ff     -> L4.x  : topo
  L4.y   -> L23.x : local(5)
  L23.y  -> L23.x : recurrent wta
  L23.y  -> up    : one2one
  L23.y  -> L5.x  : local(3)
  L5.y   -> L6.x  : local(3)
  fb     -> L23.x : sparse(0.05)
  L5.y   -> down  : one2one
  L6.y   -> down  : sparse(0.1)
}

section Brain {
  in  retina[4096]  in cochlea[1024]  in skin[2048]
  out muscles[512]

  // relays
  section Thalamus {
    section LGN { in x[1024] out y[1024] }   // vision
    section MGN { in x[512]  out y[512] }    // hearing
    section VPL { in x[512]  out y[512] }    // touch
    section VL  { in x[512]  out y[512] }    // motor
  }

  section Cortex {
    section V1  : CorticalArea(4096)
    section V2  : CorticalArea(2048)
    section A1  : CorticalArea(1024)
    section S1  : CorticalArea(2048)
    section M1  : CorticalArea(1024)
    section PFC : CorticalArea(2048)
  }

  section Hippocampus {
    section DG  { in x[2048] out y[2048] }   // sparse expansion
    section CA3 { in x[512]  out y[512] }    // pattern completion
    section CA1 { in x[512]  out y[512] }    // memory vs. current input
    DG.y  -> CA3.x : sparse(0.02)
    CA3.y -> CA3.x : recurrent stdp
    CA3.y -> CA1.x : all
  }

  section BasalGanglia {
    section Striatum { in x[1024] out y[1024] }
    section GPi      { in x[256]  out y[256] }
    section STN      { in x[128]  out y[128] }
    Striatum.y -> GPi.x : converge inh
    STN.y      -> GPi.x : all
  }

  section Cerebellum {
    section Granule  { in x[4096] out y[4096] }
    section Purkinje { in x[256]  out y[256] }
    Granule.y -> Purkinje.x : expand sparse(0.01)
  }

  section SNc { out da[64] }   // dopamine

  // sensory input
  retina -> LGN.x : topo     cochlea -> MGN.x : topo     skin -> VPL.x : topo
  LGN.y -> V1.ff : topo      MGN.y -> A1.ff : topo       VPL.y -> S1.ff : topo

  // cortical hierarchy
  V1.up   -> V2.ff  : topo
  V2.down -> V1.fb  : sparse(0.1)
  V2.up   -> PFC.ff : sparse(0.1)
  PFC.up <-> Hippocampus : sparse(0.05)

  // cortex -> BG -> thalamus -> cortex
  loop motor {
    PFC.down -> Striatum.x : sparse(0.1)
    GPi.y    -> VL.x       : inh
    VL.y     -> M1.ff      : topo
  }
  M1.down    -> Cerebellum : expand
  Cerebellum -> VL.x       : converge
  M1.down    -> muscles    : topo

  // neuromodulation
  SNc.da ~> Striatum : dopamine
}` },
  { id: 'vision', name: 'Small vision pipeline', source: `// minimal example
section Vision {
  in  retina[784]
  out features[64]

  section Edges   { in x[784] out y[256] }
  section Memory  { in x[256] out y[256] }
  section Readout { in x[256] out y[64] }

  retina    -> Edges.x   : local(3x3)
  Edges.y   -> Memory.x  : sparse(0.1) stdp
  Memory.y  -> Memory.x  : recurrent inh delay(2ms)
  Memory.y  -> Readout.x : all
  Readout.y -> features  : one2one
}` },
];
