// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Inject, Injectable, SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {APP_TIMESPAN, FhirResourceType} from '../constants';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {documentReferenceLoinc} from './clinicalconcepts/resource-code-manager';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {DebuggerService} from './debugger.service';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation, ObservationStatus} from './fhir-data-classes/observation';
import {FhirService} from './fhir.service';
import {SMART_ON_FHIR_CLIENT} from './smart-on-fhir-client';


const GREATER_OR_EQUAL = 'ge';
const LESS_OR_EQUAL = 'le';

// The Cerner implementation has a maximum result return of 100 for
// observations.
const CERNER_MAX_OBS_RESULTS_RETURNED = 100;

@Injectable()
export class FhirHttpService extends FhirService {
  readonly smartApiPromise: Promise<any>;
  errorMessage: string;

  private createContentTypeString = 'application/xhtml+xml;charset=utf-8';

  constructor(
      private debugService: DebuggerService,
      @Inject(SMART_ON_FHIR_CLIENT) smartOnFhirClient: any,
      private sanitizer: DomSanitizer) {
    super();
    // Create a promise which resolves to the smart API when the smart API is
    // ready. This allows clients of this service to call service methods
    // which depend on the API, regardless of whether the API is ready or not.
    this.smartApiPromise = new Promise(
        (resolve, reject) => smartOnFhirClient.oauth2.ready(
            smart => resolve(smart), err => reject(err)));
  }

  /**
   * Gets observations from a specified date range with a specific LOINC code.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If set, the number of observations that should be
   *     queried for
   */
  getObservationsWithCode(
      code: LOINCCode, dateRange: Interval,
      limitCount?: number): Promise<Observation[]> {
    const queryParams = {
      type: FhirResourceType.Observation,
      query: {
        code: LOINCCode.CODING_STRING + '|' + code.codeString,
        date: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISO(),
            LESS_OR_EQUAL + dateRange.end.toISO()
          ]
        },
        _count: limitCount ? limitCount : CERNER_MAX_OBS_RESULTS_RETURNED
      }
    };

    return this.smartApiPromise.then(
        smartApi =>
            smartApi.patient.api.fetchAll(queryParams)
                .then(
                    (results: any[]) =>
                        results
                            .map(result => {
                              return new Observation(result);
                            })
                            // TODO(b/126775896): Determine which statuses to
                            // filter out.
                            .filter(
                                result => result.status !==
                                    ObservationStatus.EnteredInError),
                    // Do not return any Observations for this code if one of
                    // the Observation constructions throws an error.
                    rejection => {
                      this.debugService.logError(rejection);
                      throw rejection;
                    }));
  }

  /**
   * Gets medication data from a specified date range with a specific Rx code
   * @param code The RxNormCode codes for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If provided, the maximum number of observations to
   *     query for.
   */
  getMedicationAdministrationsWithCode(
      code: RxNormCode, dateRange: Interval,
      limitCount?: number): Promise<MedicationAdministration[]> {
    return Promise.resolve([]);
  }

  /**
   * Gets order for specified external id.
   * @param id The id to pull the order from.
   */
  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    return this.smartApiPromise.then(
        smartApi =>
            smartApi.patient.api
                .read({type: FhirResourceType.MedicationOrder, 'id': id})
                .then(
                    (result: any) => {
                      return new MedicationOrder(result.data);
                    },
                    // Do not return any MedicationOrders for
                    // this code if one of the MedicationOrder
                    // constructions throws an error.
                    rejection => {
                      this.debugService.logError(rejection);
                      throw rejection;
                    }));
  }

  /**
   * Gets administrations for specified order id.
   * @param id The id to pull the order from.
   */
  getMedicationAdministrationsWithOrder(id: string):
      Promise<MedicationAdministration[]> {
    const queryParams = {
      type: FhirResourceType.MedicationAdministration,

      query: {
        prescription:
            {reference: [FhirResourceType.MedicationOrder, id].join('/')}
      }
    };
    return this.smartApiPromise.then(
        smartApi => smartApi.patient.api.fetchAll(queryParams)
                        .then(
                            (results: any[]) => {
                              results.map(result => {
                                return new MedicationAdministration(result);
                              });
                            },
                            // Do not return any MedicationOrders for
                            // this code if one of the MedicationOrder
                            // constructions throws an error.
                            rejection => {
                              this.debugService.logError(rejection);
                              throw rejection;
                            }));
  }

  /**
   * Gets the encounters for the patient for any encounter that falls in the
   * given date range.
   * @param dateRange Return all encounters that covered any time in this
   *   date range.
   */
  getEncountersForPatient(dateRange: Interval): Promise<Encounter[]> {
    const queryParams = {
      type: FhirResourceType.Encounter,
    };

    if (!dateRange) {
      dateRange = APP_TIMESPAN;
    }

    return Promise.resolve([new Encounter({
      'class': 'inpatient',
      'id': '4027918',
      'identifier': [{
        'period': {'start': '2016-06-22T21:06:58.000Z'},
        'system': 'urn:oid:3.3.3.3.3.3',
        'type': {'text': 'FIN NBR'},
        'use': 'usual',
        'value': '20003412'
      }],
      'location': [{
        'location': {
          'display': 'Baseline East Medical Center, BE Hospital, 1N, 0152, A',
          'reference': 'Location/35646785'
        },
        'status': 'completed'
      }],
      'meta': {'lastUpdated': '2016-06-27T15:01:18.000Z', 'versionId': '1'},
      'participant': [
        {
          'individual':
              {'display': 'Who, Doctor', 'reference': 'Practitioner/1'},
          'period': {'start': '2016-11-09T18:07:16.000Z'},
          'type': [{
            'coding': [{
              'code': 'ADM',
              'display': 'admitter',
              'system': 'http://hl7.org/fhir/v3/ParticipationType',
              'userSelected': false
            }],
            'text': 'Admitting Physician'
          }]
        },
        {
          'individual':
              {'display': 'Song, River', 'reference': 'Practitioner/2048007'},
          'period': {'start': '2016-11-09T15:44:00.000Z'},
          'type': [{
            'coding': [{
              'code': 'ADM',
              'display': 'admitter',
              'system': 'http://hl7.org/fhir/v3/ParticipationType',
              'userSelected': false
            }],
            'text': 'Admitting Physician'
          }]
        },
        {
          'individual': {
            'display': 'Strange, Doctor',
            'reference': 'Practitioner/1912007'
          },
          'period': {'start': '2016-06-22T21:06:58.000Z'},
          'type': [{
            'coding': [{
              'code': 'ADM',
              'display': 'admitter',
              'system': 'http://hl7.org/fhir/v3/ParticipationType',
              'userSelected': false
            }],
            'text': 'Admitting Physician'
          }]
        },
        {
          'individual': {
            'display': 'Strange, Doctor',
            'reference': 'Practitioner/1912007'
          },
          'period': {'start': '2016-06-22T21:06:58.000Z'},
          'type': [{
            'coding': [{
              'code': 'ATND',
              'display': 'attender',
              'system': 'http://hl7.org/fhir/v3/ParticipationType',
              'userSelected': false
            }],
            'text': 'Attending Physician'
          }]
        },
        {
          'individual': {
            'display': 'Strange, Doctor',
            'reference': 'Practitioner/1912007'
          },
          'period': {'start': '2016-06-27T15:03:36.000Z'},
          'type': [{
            'coding': [{
              'code': 'PPRF',
              'display': 'primary performer',
              'system': 'http://hl7.org/fhir/v3/ParticipationType',
              'userSelected': false
            }],
            'text': 'Ordering Physician'
          }]
        },
        {
          'individual': {
            'display': 'Frankenstein, Doctor',
            'reference': 'Practitioner/1590015'
          },
          'period': {
            'end': '2016-06-23T18:34:38.000Z',
            'start': '2016-06-23T18:34:38.000Z'
          },
          'type': [{
            'coding': [{
              'code': 'PART',
              'display': 'Participation',
              'system': 'http://hl7.org/fhir/v3/ParticipationType',
              'userSelected': false
            }],
            'text': 'Other'
          }]
        },
        {
          'individual': {
            'display': 'Strange, Doctor',
            'reference': 'Practitioner/1912007'
          },
          'period': {'start': '2016-06-22T21:06:58.000Z'},
          'type': [{
            'coding': [{
              'code': 'REF',
              'display': 'referrer',
              'system': 'http://hl7.org/fhir/v3/ParticipationType',
              'userSelected': false
            }],
            'text': 'Referring Physician'
          }]
        }
      ],
      'patient': {'display': 'Smart, Joe', 'reference': 'Patient/4342010'},
      'period': {
        'start': '2018-10-01T06:00:00.000Z',
        'end': '2018-10-10T06:00:00.000Z'
      },
      'resourceType': 'Encounter',
      'serviceProvider': {'reference': 'Organization/619848'},
      'status': 'finished',
      'text': {
        'div':
            '<div><p><b>Encounter</b></p><p><b>Location</b>: Baseline East Medical Center, BE Hospital, 1N, 0152, A</p><p><b>Type</b>: Inpatient</p><p><b>Status</b>: Discharged</p><p><b>Period Start Date</b>: Wed Jun 22 21:05:00 2016 (UTC)</p><p><b>Attending Physician</b>: Strange, Doctor</p></div>',
        'status': 'generated'
      },
      'type': [{'text': 'Inpatient'}]
    })]);
  }

  /**
   * Saves the current HTML of the graphs rendered as a DocumentReference
   * (static save).
   * @param html The inner HTML to keep in the Document.
   * @param date The date the note was written on.
   */
  saveStaticNote(html: string, date: string) {
    html = this.sanitizer.sanitize(SecurityContext.HTML, html);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const xhtml = new XMLSerializer().serializeToString(doc);
    const testData = {
      resource: {
        resourceType: FhirResourceType.DocumentReference,
        type: {
          coding: [{
            system: LOINCCode.CODING_STRING,          // must be loinc
            code: documentReferenceLoinc.codeString,  // Summary Note
          }],
        },
        indexed: date,
        status:
            'current',  // Required; only supported option is 'current'
                        // https://fhir.cerner.com/millennium/dstu2/infrastructure/document-reference/#body-fields
        content: [{
          attachment: {
            contentType: this.createContentTypeString,
            data: btoa(xhtml),
          }
        }],
      }
    };
    // TODO(b/119119092): Currently we only have permissions to write for
    // Timmy (patient id 4342012), not Wilma
    this.smartApiPromise.then(smartApi => {
      testData['resource']['subject'] = {
        reference: [FhirResourceType.Patient, smartApi.patient.id].join('/')
      };
      testData['resource']['context'] = {
        encounter: {
          reference: [
            FhirResourceType.Encounter, smartApi.tokenResponse.encounter
          ].join('/')
        }
      };
      smartApi.patient.api.create(testData);
      return smartApi;
    });
  }

  /**
   * Gets the DiagnosticReports for the patient for any report that falls in
   * the given date range.
   * @param codeGroup The CodeGroup to retrieve DiagnosticReports for.
   * @param dateRange Return all DiagnosticReports that covered any time in this
   *   date range.
   */
  // TODO(b/119121684): Make API calls to get DiagnosticReports.
  getDiagnosticReports(codeGroup: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<DiagnosticReport[]> {
    return Promise.resolve([]);
  }
}
