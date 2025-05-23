/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Meta } from '@storybook/react';

import { UseArray } from './use_array';
import { useArrayStories } from './__stories__';

const { UseArrayBasic, UseArrayReorder, UseArrayComplex, UseArrayDynamicData } = useArrayStories;

export default {
  component: UseArray,
  title: 'Form lib/UseArray',
  decorators: [
    (Story) => {
      return (
        <div style={{ maxWidth: '600px' }}>
          <Story />
        </div>
      );
    },
  ],
} as Meta<typeof UseArray>;

export { UseArrayBasic, UseArrayReorder, UseArrayComplex, UseArrayDynamicData };
