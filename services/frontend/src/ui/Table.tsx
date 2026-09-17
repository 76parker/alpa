import { Table as PatternFlyTable, type TableProps } from '@patternfly/react-table';

/** Operational tables remain tabular and scroll horizontally on small screens. */
export function Table(props: TableProps) {
  return <PatternFlyTable variant="compact" gridBreakPoint="" {...props} />;
}

export { Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
