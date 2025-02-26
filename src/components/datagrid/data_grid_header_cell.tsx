import React, {
  AriaAttributes,
  FunctionComponent,
  HTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import { htmlIdGenerator } from '../../services/accessibility';
import classnames from 'classnames';
import { EuiDataGridHeaderRowPropsSpecificProps } from './data_grid_header_row';
import { keyCodes } from '../../services';
import { EuiDataGridColumnResizer } from './data_grid_column_resizer';
import { EuiScreenReaderOnly } from '../accessibility';
import tabbable from 'tabbable';
import { EuiDataGridColumn } from './data_grid_types';

export interface EuiDataGridHeaderCellProps
  extends Omit<
    EuiDataGridHeaderRowPropsSpecificProps,
    'columns' | 'leadingControlColumns'
  > {
  column: EuiDataGridColumn;
  index: number;
  className?: string;
}

export const EuiDataGridHeaderCell: FunctionComponent<
  EuiDataGridHeaderCellProps
> = props => {
  const {
    column,
    index,
    columnWidths,
    schema,
    defaultColumnWidth,
    setColumnWidth,
    sorting,
    focusedCell,
    setFocusedCell,
    headerIsInteractive,
    className,
  } = props;
  const { id, display } = column;

  const width = columnWidths[id] || defaultColumnWidth;

  const ariaProps: {
    'aria-sort'?: AriaAttributes['aria-sort'];
    'aria-describedby'?: AriaAttributes['aria-describedby'];
  } = {};

  let screenReaderId;
  let sortString;

  if (sorting) {
    const sortedColumnIds = new Set(sorting.columns.map(({ id }) => id));

    if (sorting.columns.length === 1 && sortedColumnIds.has(id)) {
      const sortDirection = sorting.columns[0].direction;

      let sortValue: HTMLAttributes<HTMLDivElement>['aria-sort'] = 'other';
      if (sortDirection === 'asc') {
        sortValue = 'ascending';
      } else if (sortDirection === 'desc') {
        sortValue = 'descending';
      }

      ariaProps['aria-sort'] = sortValue;
    } else if (sorting.columns.length >= 2 && sortedColumnIds.has(id)) {
      sortString = sorting.columns
        .map(col => `Sorted by ${col.id} ${col.direction}`)
        .join(' then ');
      screenReaderId = htmlIdGenerator()();
      ariaProps['aria-describedby'] = screenReaderId;
    }
  }

  const columnType = schema[id] ? schema[id].columnType : null;

  const classes = classnames(
    'euiDataGridHeaderCell',
    {
      [`euiDataGridHeaderCell--${columnType}`]: columnType,
    },
    className
  );

  const headerRef = useRef<HTMLDivElement>(null);
  const isFocused =
    focusedCell != null && focusedCell[0] === index && focusedCell[1] === -1;
  const [isCellEntered, setIsCellEntered] = useState(false);

  useEffect(() => {
    if (headerRef.current) {
      function enableInteractives() {
        const interactiveElements = headerRef.current!.querySelectorAll(
          '[data-euigrid-tab-managed]'
        );
        for (let i = 0; i < interactiveElements.length; i++) {
          interactiveElements[i].setAttribute('tabIndex', '0');
        }
      }

      function disableInteractives() {
        const tababbles = tabbable(headerRef.current!);
        if (tababbles.length > 1) {
          console.warn(
            `EuiDataGridHeaderCell expects at most 1 tabbable element, ${
              tababbles.length
            } found instead`
          );
        }
        for (let i = 0; i < tababbles.length; i++) {
          const element = tababbles[i];
          element.setAttribute('data-euigrid-tab-managed', 'true');
          element.setAttribute('tabIndex', '-1');
        }
      }

      if (isCellEntered) {
        enableInteractives();
        const tabbables = tabbable(headerRef.current!);
        if (tabbables.length > 0) {
          tabbables[0].focus();
        }
      } else {
        disableInteractives();
      }
    }
  }, [isCellEntered]);

  useEffect(() => {
    if (headerRef.current) {
      if (isFocused) {
        const interactives = headerRef.current.querySelectorAll(
          '[data-euigrid-tab-managed]'
        );
        if (interactives.length === 1) {
          setIsCellEntered(true);
        } else {
          headerRef.current.focus();
        }
      } else {
        setIsCellEntered(false);
      }

      // focusin bubbles while focus does not, and this needs to react to children gaining focus
      function onFocusIn(e: FocusEvent) {
        if (headerIsInteractive === false) {
          // header is not interactive, avoid focusing
          requestAnimationFrame(() => headerRef.current!.blur());
          e.preventDefault();
          return false;
        } else {
          // take the focus
          setFocusedCell([index, -1]);
        }
      }

      // focusout bubbles while blur does not, and this needs to react to the children losing focus
      function onFocusOut() {
        // wait for the next element to receive focus, then update interactives' state
        requestAnimationFrame(() => {
          if (headerRef.current) {
            if (headerRef.current.contains(document.activeElement) === false) {
              setIsCellEntered(false);
            }
          }
        });
      }

      function onKeyUp(e: KeyboardEvent) {
        switch (e.keyCode) {
          case keyCodes.ENTER: {
            e.preventDefault();
            setIsCellEntered(true);
            break;
          }
          case keyCodes.ESCAPE: {
            e.preventDefault();
            // move focus to cell
            setIsCellEntered(false);
            headerRef.current!.focus();
            break;
          }
          case keyCodes.F2: {
            e.preventDefault();
            if (document.activeElement === headerRef.current) {
              // move focus into cell's interactives
              setIsCellEntered(true);
            } else {
              // move focus to cell
              setIsCellEntered(false);
              headerRef.current!.focus();
            }
            break;
          }
        }
      }

      const headerNode = headerRef.current;
      // @ts-ignore-next line TS doesn't have focusin
      headerNode.addEventListener('focusin', onFocusIn);
      headerNode.addEventListener('focusout', onFocusOut);
      headerNode.addEventListener('keyup', onKeyUp);
      return () => {
        // @ts-ignore-next line TS doesn't have focusin
        headerNode.removeEventListener('focusin', onFocusIn);
        headerNode.removeEventListener('focusout', onFocusOut);
        headerNode.removeEventListener('keyup', onKeyUp);
      };
    }
  }, [headerIsInteractive, isFocused, setIsCellEntered, setFocusedCell, index]);

  return (
    <div
      role="columnheader"
      {...ariaProps}
      ref={headerRef}
      tabIndex={isFocused ? 0 : -1}
      className={classes}
      data-test-subj={`dataGridHeaderCell-${id}`}
      style={width != null ? { width: `${width}px` } : {}}>
      {column.isResizable !== false && width != null ? (
        <EuiDataGridColumnResizer
          columnId={id}
          columnWidth={width}
          setColumnWidth={setColumnWidth}
        />
      ) : null}

      <div className="euiDataGridHeaderCell__content">{display || id}</div>
      {sorting && sorting.columns.length >= 2 && (
        <EuiScreenReaderOnly>
          <div id={screenReaderId}>{sortString}</div>
        </EuiScreenReaderOnly>
      )}
    </div>
  );
};
