/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2022-2025. All rights reserved.
 */

import { Step, Transform } from 'prosemirror-transform';
import {removeDuplicates,} from '@tiptap/react'
import { Node as PMNode } from 'prosemirror-model'

export type Range = {
  from: number;
  to: number;
};

export type ChangedRange = {
  oldRange: Range,
  newRange: Range,
}

export type NodeWithPos = { pos: number; node: PMNode };


function simplifyChangedRanges(changes: ChangedRange[]): ChangedRange[] {
  const uniqueChanges = removeDuplicates(changes);
  
  return uniqueChanges.length === 1
    ? uniqueChanges
    : uniqueChanges.filter((change, index) => {
      const rest = uniqueChanges.filter((_, i) => i !== index);
      
      return !rest.some((otherChange) => {
        return (
          change.oldRange.from >= otherChange.oldRange.from &&
          change.oldRange.to <= otherChange.oldRange.to &&
          change.newRange.from >= otherChange.newRange.from &&
          change.newRange.to <= otherChange.newRange.to
        );
      });
    });
}

// 在原本 getChangedRanges 基础上合并变量，减少操作
export function getChangedRangesPlus(transform: Transform): ChangedRange[] {
  const { mapping, steps } = transform;
  const changes: ChangedRange[] = [];
  
  const mappingInvert = mapping.invert();
  
  mapping.maps.forEach((stepMap, index) => {
    const ranges: Range[] = [];
    
    // @ts-expect-error
    if (!stepMap.ranges.length) {
      const { from, to } = steps[index] as Step & {
        from?: number;
        to?: number;
      };
      
      if (from === undefined || to === undefined) {
        return;
      }
      
      ranges.push({ from, to });
    } else {
      stepMap.forEach((from, to) => {
        ranges.push({ from, to });
      });
    }
    
    const mappingSlice = mapping.slice(index);
    
    ranges.forEach(({ from, to }) => {
      const newStart = mappingSlice.map(from, -1);
      const newEnd = mappingSlice.map(to);
      const oldStart = mappingInvert.map(newStart, -1);
      const oldEnd = mappingInvert.map(newEnd);
      
      changes.push({
        oldRange: {
          from: oldStart,
          to: oldEnd,
        },
        newRange: {
          from: newStart,
          to: newEnd,
        },
      });
    });
  });
  
  return simplifyChangedRanges(changes);
}