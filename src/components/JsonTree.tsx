import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface JsonTreeProps {
  data: any;
  name?: string;
  isLast?: boolean;
  initiallyExpanded?: boolean;
}

export const JsonTree: React.FC<JsonTreeProps> = ({ data, name, isLast = true, initiallyExpanded = false }) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const isObject = typeof data === 'object' && data !== null;
  const isArray = Array.isArray(data);

  if (!isObject) {
    const renderValue = () => {
      if (typeof data === 'string') {
        return <span className="text-green-600 dark:text-green-400">"{data}"</span>;
      }
      if (typeof data === 'number') {
        return <span className="text-blue-600 dark:text-blue-400">{data}</span>;
      }
      if (typeof data === 'boolean') {
        return <span className="text-orange-600 dark:text-orange-400">{data ? 'true' : 'false'}</span>;
      }
      if (data === null) {
        return <span className="text-gray-500 italic">null</span>;
      }
      return <span>{String(data)}</span>;
    };

    return (
      <div className="font-mono text-xs leading-5">
        {name && <span className="text-[var(--text-primary)] mr-1">"{name}":</span>}
        {renderValue()}
        {!isLast && <span className="text-[var(--text-secondary)]">,</span>}
      </div>
    );
  }

  const keys = Object.keys(data);
  const isEmpty = keys.length === 0;

  return (
    <div className="font-mono text-xs leading-5">
      <div 
        className="flex items-center cursor-pointer hover:bg-[var(--bg-hover)] rounded -ml-4 pl-4 py-0.5 select-none json-tree-node"
        onClick={() => !isEmpty && setExpanded(!expanded)}
      >
        <span className="w-4 h-4 inline-flex items-center justify-center shrink-0 -ml-4">
          {!isEmpty && (
            expanded ? <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" /> : <ChevronRight className="w-3 h-3 text-[var(--text-secondary)]" />
          )}
        </span>
        
        {name && <span className="text-[var(--text-primary)] mr-1">"{name}":</span>}
        <span className="text-[var(--text-secondary)]">
          {isArray ? '[' : '{'}
          {!expanded && !isEmpty && ` ... `}
          {isEmpty && (isArray ? ']' : '}')}
        </span>
        {!expanded && !isEmpty && <span className="text-[var(--text-secondary)]">{isArray ? ']' : '}'}{!isLast ? ',' : ''}</span>}
      </div>
      
      {expanded && !isEmpty && (
        <div className="pl-4 border-l border-[var(--border-subtle)] ml-1.5 my-0.5">
          {keys.map((key, index) => (
            <JsonTree
              key={key}
              name={isArray ? undefined : key}
              data={data[key as keyof typeof data]}
              isLast={index === keys.length - 1}
              initiallyExpanded={false}
            />
          ))}
        </div>
      )}
      {expanded && !isEmpty && (
        <div className="text-[var(--text-secondary)] ml-1.5">
          {isArray ? ']' : '}'}
          {!isLast && ','}
        </div>
      )}
    </div>
  );
};
