/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren, HTMLAttributes } from 'react';
import { EuiErrorBoundary, EuiFlexGroup, EuiFlexItem, EuiLoadingChart } from '@elastic/eui';

interface Props {
  /**
   * Height for the chart
   */
  height?: string;
  /**
   * if chart data source is still loading
   */
  loading?: boolean;
  /**
   * aria-label for accessibility
   */
  'aria-label'?: string;
}

export const ChartWrapper: FC<PropsWithChildren<Props>> = ({
  loading = false,
  height = '100%',
  children,
  ...rest
}) => {
  const opacity = loading === true ? 0.3 : 1;

  return (
    <EuiErrorBoundary>
      <figure
        style={{
          height,
          opacity,
          transition: 'opacity 0.2s',
        }}
        {...(rest as HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </figure>
      {loading === true && (
        <EuiFlexGroup
          justifyContent="spaceAround"
          alignItems="center"
          style={{ height, marginTop: `-${height}`, marginBottom: 0 }}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiErrorBoundary>
  );
};
