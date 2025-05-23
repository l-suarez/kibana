/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionDefinition, FunctionParameterType } from './types';

/**
 * Given a function definition, this function will return a list of function signatures
 *
 * If withTypes is true, the function will return a formal function definition with all arguments typed.
 * This is used when generating the function signature for the monaco editor. If withTypes is false, you get
 * an "injectable" version of the signature to be used to generate test cases.
 */
export function getFunctionSignatures(
  { name, signatures }: FunctionDefinition,
  { withTypes, capitalize }: { withTypes: boolean; capitalize?: boolean } = {
    withTypes: true,
    capitalize: false,
  }
) {
  return signatures.map(({ params, returnType, minParams }) => {
    // for functions with a minimum number of args, repeat the last arg multiple times
    // just make sure to compute the right number of args to add
    const minParamsToAdd = Math.max((minParams || 0) - params.length, 0);
    const extraArg = Array(minParamsToAdd || 1).fill(params[Math.max(params.length - 1, 0)]);
    return {
      declaration: `${capitalize ? name.toUpperCase() : name}(${params
        .map((arg) => printArguments(arg, withTypes))
        .join(', ')}${handleAdditionalArgs(minParamsToAdd > 0, extraArg, withTypes)})${
        withTypes ? `: ${returnType}` : ''
      }`,
    };
  });
}

function handleAdditionalArgs(
  criteria: boolean,
  additionalArgs: Array<{
    name: string;
    type: FunctionParameterType | FunctionParameterType[];
    optional?: boolean;
    reference?: string;
  }>,
  withTypes: boolean
) {
  return criteria
    ? `${withTypes ? ' ,[... ' : ', '}${additionalArgs
        .map((arg) => printArguments(arg, withTypes))
        .join(', ')}${withTypes ? ']' : ''}`
    : '';
}

export function printArguments(
  {
    name,
    type,
    optional,
  }: {
    name: string;
    type: FunctionParameterType | FunctionParameterType[];
    optional?: boolean;
  },
  withTypes: boolean
): string {
  if (!withTypes) {
    return name;
  }
  return `${name}${optional ? ':?' : ':'} ${Array.isArray(type) ? type.join(' | ') : type}`;
}
