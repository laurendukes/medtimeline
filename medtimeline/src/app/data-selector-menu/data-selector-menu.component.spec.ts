// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
// tslint:disable-next-line:max-line-length
import {MatAutocompleteModule, MatFormFieldModule, MatIconModule, MatInputModule, MatListModule, MatMenuModule, MatTooltipModule} from '@angular/material';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {ResourceCodeManager} from '../clinicalconcepts/resource-code-manager';
import {DataSelectorElementComponent} from '../data-selector-element/data-selector-element.component';
import {StubFhirService} from '../test_utils';

import {DataSelectorMenuComponent} from './data-selector-menu.component';

// TODO(b/122653172): Add tests to test event emissions.
describe('DataSelectorMenuComponent', () => {
  let component: DataSelectorMenuComponent;
  let fixture: ComponentFixture<DataSelectorMenuComponent>;
  const resourceCodeManagerStub =
      new ResourceCodeManager(new StubFhirService());

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          declarations:
              [DataSelectorMenuComponent, DataSelectorElementComponent],
          imports: [
            MatMenuModule,
            MatTooltipModule,
            MatIconModule,
            MatListModule,
            MatAutocompleteModule,
            MatFormFieldModule,
            FormsModule,
            ReactiveFormsModule,
            MatInputModule,
            BrowserAnimationsModule,
          ],
          providers: [
            {provide: ResourceCodeManager, useValue: resourceCodeManagerStub},
          ]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DataSelectorMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter concepts based on input', fakeAsync(() => {
       const userInput = 'CB';
       expect(component.filter(userInput).length).toEqual(2);
       expect(new Set(component.filter(userInput).map(x => x.label)))
           .toEqual(new Set(['CBC', 'CBC White Blood Cell']));
     }));
});
