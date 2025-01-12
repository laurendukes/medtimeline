// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import * as Color from 'color';
import * as BCHColors from '../theme/bch_colors';


export const ALL_DISPLAY_GROUPS_MAP = new Map<string, DisplayGrouping>();

/**
 * Represents the category that a certain chart's data might fall into, for
 * example a MedicationConcept such as "Antibiotic" or a ClinicalConcept such as
 * "Lab result"
 */
export class DisplayGrouping {
  static colorIdx = 0;
  fill: Color;
  outline: Color;

  constructor(readonly label: string, color?: Color, outline?: Color) {
    if (ALL_DISPLAY_GROUPS_MAP.has(label)) {
      return ALL_DISPLAY_GROUPS_MAP.get(label);
    }

    let tempColor: Color = color;
    if (color === undefined) {
      tempColor = BCHColors.getDataColors()[DisplayGrouping.colorIdx];
      DisplayGrouping.colorIdx =
          (DisplayGrouping.colorIdx + 1) % BCHColors.getDataColors().length;
    }
    this.fill = tempColor;
    this.outline = outline ? outline : tempColor;
    ALL_DISPLAY_GROUPS_MAP.set(label, this);
  }
}


export const labResult =
    new DisplayGrouping('Lab Results', BCHColors.MATERIAL_GREEN);
export const vitalSign =
    new DisplayGrouping('Vital Signs', BCHColors.MATERIAL_YELLOW);
export const culture =
    new DisplayGrouping('Cultures', BCHColors.BOSTON_WARM_GRAY);
export const med =
    new DisplayGrouping('Vancomycin and Gentamicin', BCHColors.MATERIAL_TEAL);
export const document = new DisplayGrouping('Document', BCHColors.BOSTON_BAY);
export const microbio =
    new DisplayGrouping('Microbiology', BCHColors.MATERIAL_ORANGE);
// We declare more DisplayGroupings related to Microbiology results that are
// used to classify points on the Microbiology chart.
export const posPrelimMB = new DisplayGrouping(
    'Check Result Preliminary', Color('#e4e2e2'), BCHColors.BOSTON_YELLOW);
export const negPrelimMB = new DisplayGrouping(
    'Negative Preliminary', Color('#e4e2e2'), BCHColors.BOSTON_BLUE);
export const posFinalMB =
    new DisplayGrouping('Check Result Final', BCHColors.BOSTON_YELLOW);
export const negFinalMB =
    new DisplayGrouping('Negative Final', BCHColors.BOSTON_BLUE);
