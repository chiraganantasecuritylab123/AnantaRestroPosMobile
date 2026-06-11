import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BarChartIcon,
  CalendarIcon,
  CartIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  FilterIcon,
  Icon,
  PaymentBadge,
  ScreenBackground,
  ShoppingBagIcon,
  TopHeader,
  TrendingUpIcon,
} from '../components/ui';
import { handleSalesOrdersBack } from '../navigation/ordersStackBack';
import type { OrdersStackParamList } from '../navigation/types';
import { useGetPosInitQuery, type PosOutletSummary } from '../services/posApi';
import {
  formatDateParam,
  resolveSalesDateRange,
  useGetSalesOrdersQuery,
  type SalesOrderItem,
  type SalesPeriod,
  type SalesRangePreset,
  type SalesSort,
  type SalesStatus,
} from '../services/salesApi';
import { resolveCurrencySymbol } from '../utils/currency';
import { cardShadow, colors, radii, spacing, typography } from '../theme';
import {
  isTablet,
  maxContentWidth,
  moderateScale,
  scale,
  verticalScale,
} from '../utils/responsive';

type Props = NativeStackScreenProps<OrdersStackParamList, 'SalesOrders'>;

type PickerKey =
  | 'date'
  | 'outlet'
  | 'payment'
  | 'sort'
  | 'status'
  | null;

type DateFilterId = 'today' | 'week' | 'month' | 'last7' | 'last30';

type FilterOption = {
  id: string;
  label: string;
};

type SummaryMetric = {
  key: string;
  title: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
  iconBg: string;
  icon: React.ReactNode;
};

const PAGE_SIZE = 20;

const DATE_FILTER_OPTIONS: { id: DateFilterId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'last30', label: 'Last 30 Days' },
];

const SORT_OPTIONS: { id: SalesSort; label: string }[] = [
  { id: 'date_desc', label: 'Latest' },
  { id: 'date_asc', label: 'Oldest' },
  { id: 'amount_desc', label: 'Amount: High to Low' },
  { id: 'amount_asc', label: 'Amount: Low to High' },
];

const STATUS_OPTIONS: { id: SalesStatus; label: string }[] = [
  { id: 'all', label: 'All Statuses' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
  { id: 'cancelled', label: 'Cancelled' },
];

function resolveDateFilter(
  id: DateFilterId,
): { rangePreset: SalesRangePreset; start: string; end: string } {
  const now = new Date();
  const today = formatDateParam(now);

  if (id === 'today') {
    return resolveSalesDateRange('today');
  }
  if (id === 'week') {
    const monday = new Date(now);
    const dayOfWeek = monday.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(monday.getDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return {
      rangePreset: 'week',
      start: formatDateParam(monday),
      end: formatDateParam(sunday),
    };
  }
  if (id === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      rangePreset: 'month',
      start: formatDateParam(monthStart),
      end: formatDateParam(monthEnd),
    };
  }
  if (id === 'last7') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { rangePreset: 'custom', start: formatDateParam(d), end: today };
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  return { rangePreset: 'custom', start: formatDateParam(d), end: today };
}

function chartApiPeriodForDateFilter(_id: DateFilterId): SalesPeriod {
  return 'day';
}

function chartGranularityLabel(id: DateFilterId): string {
  if (id === 'today') {
    return 'Hourly';
  }
  return 'Daily';
}

function hourBucketKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}`;
}

function formatHourChartLabel(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    hour12: true,
  });
}

function formatDayChartLabel(d: Date, compact: boolean): string {
  if (compact) {
    return d.toLocaleDateString(undefined, { day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
  });
}

function buildChartBuckets(
  dateFilterId: DateFilterId,
  start: string,
  end: string,
): { keys: string[]; labels: string[]; granularity: 'hour' | 'day' } {
  if (dateFilterId === 'today') {
    const base = new Date(`${start}T00:00:00`);
    const keys: string[] = [];
    const labels: string[] = [];
    for (let h = 0; h < 24; h++) {
      const slot = new Date(base);
      slot.setHours(h, 0, 0, 0);
      keys.push(hourBucketKey(slot));
      labels.push(formatHourChartLabel(slot));
    }
    return { keys, labels, granularity: 'hour' };
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const keys: string[] = [];
  const labels: string[] = [];
  const compactLabels = dateFilterId === 'month' || dateFilterId === 'last30';
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    keys.push(formatDateParam(cursor));
    labels.push(formatDayChartLabel(cursor, compactLabels));
    cursor.setDate(cursor.getDate() + 1);
  }

  return { keys, labels, granularity: 'day' };
}

function normalizeSalesChart(
  dateFilterId: DateFilterId,
  dateRange: { start: string; end: string },
  salesChart?: {
    labels?: string[];
    salesAmount?: number[];
  },
): { labels: string[]; values: number[] } {
  const { keys, labels, granularity } = buildChartBuckets(
    dateFilterId,
    dateRange.start,
    dateRange.end,
  );
  const valueByKey = new Map<string, number>();

  salesChart?.labels?.forEach((iso, index) => {
    const parsed = new Date(iso);
    const key =
      granularity === 'hour'
        ? hourBucketKey(parsed)
        : formatDateParam(parsed);
    const amount = salesChart.salesAmount?.[index] ?? 0;
    valueByKey.set(key, (valueByKey.get(key) ?? 0) + amount);
  });

  return {
    labels,
    values: keys.map(key => valueByKey.get(key) ?? 0),
  };
}

function outletOptionId(outlet: PosOutletSummary): string {
  return String(outlet.id ?? outlet.outlet_id ?? '');
}

function outletOptionLabel(outlet: PosOutletSummary): string {
  return String(outlet.title ?? outlet.name ?? 'Outlet');
}

function formatSalesAmount(
  amount: number,
  currency: string,
  decimals = 2,
): string {
  return `${currency}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatGrowthSubtext(
  pct: number | null | undefined,
  periodLabel: string,
): { text: string; color: string } {
  if (pct == null || Number.isNaN(pct)) {
    return { text: '', color: colors.muted };
  }
  const up = pct >= 0;
  return {
    text: `${up ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% vs ${periodLabel}`,
    color: up ? colors.green : colors.error,
  };
}

function formatDateRangeLabel(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  if (start === end) {
    return fmt(start);
  }
  return `${fmt(start)} – ${fmt(end)}`;
}

function chartTitleForDateFilter(id: DateFilterId): string {
  if (id === 'today') {
    return 'Sales (Today)';
  }
  if (id === 'week') {
    return 'Sales (This Week)';
  }
  if (id === 'month') {
    return 'Sales (This Month)';
  }
  return 'Sales';
}

function niceChartMax(value: number): number {
  if (value <= 0) {
    return 1000;
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  if (normalized <= 1) {
    return magnitude;
  }
  if (normalized <= 2) {
    return 2 * magnitude;
  }
  if (normalized <= 5) {
    return 5 * magnitude;
  }
  return 10 * magnitude;
}

function formatChartYLabel(val: number, currency: string): string {
  if (val <= 0) {
    return `${currency}0`;
  }
  if (val >= 1000) {
    const thousands = val / 1000;
    if (thousands >= 10) {
      return `${currency}${Math.round(thousands)}K`;
    }
    const rounded = Math.round(thousands * 10) / 10;
    return Number.isInteger(rounded)
      ? `${currency}${rounded}K`
      : `${currency}${rounded.toFixed(1)}K`;
  }
  return `${currency}${Math.round(val)}`;
}

function buildYLabels(maxY: number, currency: string): string[] {
  const steps = 5;
  const labels: string[] = [];
  for (let i = steps; i >= 0; i--) {
    const val = (maxY / steps) * i;
    labels.push(formatChartYLabel(val, currency));
  }
  return labels;
}

function SummaryMetricsPanel({ metrics }: { metrics: SummaryMetric[] }) {
  if (!metrics.length) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.metricsRow}>
      {metrics.map(metric => (
        <View key={metric.key} style={styles.metricCard}>
          <View
            style={[styles.metricIconWrap, { backgroundColor: metric.iconBg }]}>
            {metric.icon}
          </View>
          <View>
            <Text style={styles.metricTitle} numberOfLines={1}>
              {metric.title}
            </Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {metric.value}
            </Text>
            {metric.subtext ? (
              <Text
                style={[
                  styles.metricSubtext,
                  metric.subtextColor ? { color: metric.subtextColor } : null,
                ]}
                numberOfLines={2}>
                {metric.subtext}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function FilterChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: 'calendar' | 'globe' | 'receipt';
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      activeOpacity={0.85}
      onPress={onPress}>
      <Icon
        name={icon}
        size={moderateScale(14)}
        color={active ? colors.green : colors.muted}
      />
      <Text
        style={[styles.filterChipText, active && styles.filterChipTextActive]}
        numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.filterChipChevron}>▾</Text>
    </TouchableOpacity>
  );
}

type FilterPickerModalProps = {
  visible: boolean;
  title: string;
  options: FilterOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

function FilterPickerModal({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: FilterPickerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.pickerSheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          onPress={e => e.stopPropagation()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon size={moderateScale(22)} color={colors.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.pickerScroll}
            showsVerticalScrollIndicator={false}>
            {options.map(option => {
              const selected = option.id === selectedId;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.pickerOption,
                    selected && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(option.id);
                    onClose();
                  }}
                  activeOpacity={0.85}>
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selected && styles.pickerOptionTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <CheckIcon
                      size={moderateScale(18)}
                      color={colors.green}
                      strokeWidth={3}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type SalesChartProps = {
  width: number;
  height: number;
  labels: string[];
  values: number[];
  currency: string;
};

function SalesLineChart({
  width,
  height,
  labels,
  values,
  currency,
}: SalesChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const padding = { top: 12, right: 8, bottom: 28, left: 8 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxValue = values.length ? Math.max(...values) : 0;
  const maxY = niceChartMax(maxValue);
  const yLabels = buildYLabels(maxY, currency);

  const points = useMemo(() => {
    if (!values.length) {
      return [];
    }
    return values.map((value, index) => {
      const x =
        padding.left +
        (index / Math.max(values.length - 1, 1)) * chartW;
      const y = padding.top + chartH - (value / maxY) * chartH;
      return { x, y, value };
    });
  }, [chartH, chartW, maxY, values]);

  useEffect(() => {
    if (!values.length) {
      setSelectedIndex(null);
      return;
    }
    let lastWithSales = -1;
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i] > 0) {
        lastWithSales = i;
        break;
      }
    }
    setSelectedIndex(lastWithSales >= 0 ? lastWithSales : values.length - 1);
  }, [labels, values]);

  const selectNearestPoint = useCallback(
    (touchX: number) => {
      if (!points.length) {
        return;
      }
      let nearest = 0;
      let minDist = Number.POSITIVE_INFINITY;
      points.forEach((point, index) => {
        const dist = Math.abs(point.x - touchX);
        if (dist < minDist) {
          minDist = dist;
          nearest = index;
        }
      });
      setSelectedIndex(nearest);
    },
    [points],
  );

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1]?.x ?? 0} ${padding.top + chartH
      } L ${points[0]?.x ?? 0} ${padding.top + chartH} Z`
      : '';

  const activeIndex =
    selectedIndex ?? Math.max(values.length - 1, 0);
  const tooltipPoint = points[activeIndex];
  const tooltipLabel = labels[activeIndex] ?? '';
  const tooltipValue = values[activeIndex] ?? 0;

  if (!values.length) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>No sales data for this period</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartYAxis}>
        {yLabels.map((label, index) => (
          <Text key={`y-${index}-${label}`} style={styles.chartYLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={colors.green} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={colors.green} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {[0, 1, 2, 3, 4, 5].map(index => {
            const y = padding.top + (index / 5) * chartH;
            return (
              <Line
                key={index}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={colors.borderLight}
                strokeWidth={1}
              />
            );
          })}
          <Rect
            x={padding.left}
            y={padding.top}
            width={chartW}
            height={chartH}
            fill="transparent"
            onPress={event => selectNearestPoint(event.nativeEvent.locationX)}
          />
          {areaPath ? <Path d={areaPath} fill="url(#salesArea)" /> : null}
          {linePath ? (
            <Path
              d={linePath}
              stroke={colors.green}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {selectedIndex != null && tooltipPoint ? (
            <Line
              x1={tooltipPoint.x}
              y1={padding.top}
              x2={tooltipPoint.x}
              y2={padding.top + chartH}
              stroke={colors.green}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.45}
            />
          ) : null}
          {points.map((point, index) => {
            const isSelected = index === activeIndex;
            const dotRadius = isSelected ? scale(9) : scale(2.5);
            const hitRadius = scale(14);
            return (
              <React.Fragment key={`point-${index}`}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={hitRadius}
                  fill="transparent"
                  onPress={() => setSelectedIndex(index)}
                />
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={dotRadius}
                  fill={isSelected ? colors.green : colors.white}
                  stroke={colors.green}
                  strokeWidth={isSelected ? 3 : 1}
                  onPress={() => setSelectedIndex(index)}
                />
              </React.Fragment>
            );
          })}
          {labels.map((label, index) => {
            const labelStep =
              labels.length <= 8
                ? 1
                : Math.max(1, Math.ceil(labels.length / 7));
            const showLabel =
              index % labelStep === 0 || index === labels.length - 1;
            if (!showLabel) {
              return null;
            }
            const x =
              padding.left +
              (index / Math.max(labels.length - 1, 1)) * chartW;
            return (
              <SvgText
                key={`${label}-${index}`}
                x={x}
                y={height - 6}
                fontSize={10}
                fill={colors.muted}
                textAnchor="middle">
                {label}
              </SvgText>
            );
          })}
        </Svg>
        {selectedIndex != null && tooltipPoint ? (
          <View
            style={[
              styles.chartTooltip,
              {
                left: Math.min(
                  Math.max(tooltipPoint.x - scale(48), scale(4)),
                  width - scale(96),
                ),
                top: Math.max(tooltipPoint.y - verticalScale(52), scale(4)),
              },
            ]}>
            {tooltipLabel ? (
              <Text style={styles.chartTooltipLabel}>{tooltipLabel}</Text>
            ) : null}
            <Text style={styles.chartTooltipText}>
              {formatSalesAmount(tooltipValue, currency)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function OrderRow({
  order,
  currency,
}: {
  order: SalesOrderItem;
  currency: string;
}) {
  const dateLabel = order.orderDate
    ? new Date(`${order.orderDate}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    : '';

  return (
    <TouchableOpacity activeOpacity={0.88}>
      <View style={styles.orderRow}>
        <View style={styles.orderIconWrap}>
          <CartIcon size={moderateScale(20)} color={colors.greenDark} />
        </View>
        <View style={styles.orderBody}>
          <Text style={styles.orderId}>
            {order.formattedToken || `#${order.tokenNo}`}
          </Text>
          <Text style={styles.orderMeta} numberOfLines={2}>
            {order.itemsCount} items • {dateLabel}, {order.orderTime} •{' '}
            {order.outletName}
          </Text>
        </View>
        <View style={styles.orderRight}>
          <PaymentBadge title={order.paymentMethod} />
          <Text style={styles.orderAmount}>
            {formatSalesAmount(order.grandTotal, currency)}
          </Text>
          <ChevronRightIcon
            size={moderateScale(18)}
            color={colors.mutedLight}
            strokeWidth={2}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const SalesOrdersScreen: React.FC<Props> = ({ navigation, route }) => {
  const onBack = useCallback(() => {
    handleSalesOrdersBack(navigation, {
      fromSideMenu: route.params?.fromSideMenu,
      fromProfile: route.params?.fromProfile,
    });
  }, [
    navigation,
    route.params?.fromProfile,
    route.params?.fromSideMenu,
  ]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }, [onBack]),
  );

  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = isTablet()
    ? Math.min(windowWidth, maxContentWidth())
    : windowWidth;
  const chartWidth = contentWidth - spacing.xl * 2 - spacing.lg * 2 - scale(36);

  const [dateFilterId, setDateFilterId] = useState<DateFilterId>('today');
  const [status, setStatus] = useState<SalesStatus>('all');
  const [sort, setSort] = useState<SalesSort>('date_desc');
  const [outletId, setOutletId] = useState<string | undefined>();
  const [paymentTypeId, setPaymentTypeId] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [activePicker, setActivePicker] = useState<PickerKey>(null);

  const dateRange = useMemo(
    () => resolveDateFilter(dateFilterId),
    [dateFilterId],
  );

  const chartPeriod = useMemo(
    () => chartApiPeriodForDateFilter(dateFilterId),
    [dateFilterId],
  );

  const { data: posInit } = useGetPosInitQuery();
  const currency = resolveCurrencySymbol(posInit?.storeSettings?.currency);

  const queryArgs = useMemo(
    () => ({
      rangePreset: dateRange.rangePreset,
      start_date: dateRange.start,
      end_date: dateRange.end,
      period: chartPeriod,
      status,
      sort,
      page,
      limit: PAGE_SIZE,
      ...(outletId ? { outlet_id: outletId } : {}),
      ...(paymentTypeId ? { payment_type: paymentTypeId } : {}),
    }),
    [
      chartPeriod,
      dateRange.end,
      dateRange.rangePreset,
      dateRange.start,
      outletId,
      page,
      paymentTypeId,
      sort,
      status,
    ],
  );

  const { data, isLoading, isFetching, isError, refetch } =
    useGetSalesOrdersQuery(queryArgs);

  const summary = data?.summary;
  const salesChart = data?.salesChart;
  const orders = data?.orders ?? [];
  const totalRecords = data?.pagination?.totalRecords ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;

  const outletOptions = useMemo<FilterOption[]>(() => {
    const fromPos = (posInit?.outlets ?? [])
      .map(outlet => ({
        id: outletOptionId(outlet),
        label: outletOptionLabel(outlet),
      }))
      .filter(o => o.id);
    const fromApi = (data?.outletAnalytics ?? []).map(o => ({
      id: o.outletId,
      label: o.outletName,
    }));
    const merged = new Map<string, FilterOption>();
    for (const o of [...fromPos, ...fromApi]) {
      if (o.id) {
        merged.set(o.id, o);
      }
    }
    return Array.from(merged.values());
  }, [data?.outletAnalytics, posInit?.outlets]);

  const paymentOptions = useMemo<FilterOption[]>(() => {
    return (posInit?.paymentTypes ?? [])
      .filter(pt => pt.is_active !== false)
      .map(pt => ({
        id: String(pt.id),
        label: pt.title,
      }))
      .filter(o => o.id);
  }, [posInit?.paymentTypes]);

  const weekGrowth = formatGrowthSubtext(
    summary?.weeklyGrowthPercent,
    'last week',
  );
  const monthGrowth = formatGrowthSubtext(
    summary?.monthlyGrowthPercent,
    'last month',
  );

  const activeFilterCount = [
    status !== 'all',
    outletId,
    paymentTypeId,
    dateFilterId !== 'today',
    sort !== 'date_desc',
  ].filter(Boolean).length;

  const resetPage = useCallback(() => setPage(1), []);

  const applyDateFilter = useCallback(
    (id: string) => {
      setDateFilterId(id as DateFilterId);
      resetPage();
    },
    [resetPage],
  );

  const applyOutletFilter = useCallback(
    (id: string) => {
      setOutletId(id === 'all' ? undefined : id);
      resetPage();
    },
    [resetPage],
  );

  const applyPaymentFilter = useCallback(
    (id: string) => {
      setPaymentTypeId(id === 'all' ? undefined : id);
      resetPage();
    },
    [resetPage],
  );

  const applySort = useCallback(
    (id: string) => {
      setSort(id as SalesSort);
      resetPage();
    },
    [resetPage],
  );

  const applyStatus = useCallback(
    (id: string) => {
      setStatus(id as SalesStatus);
      resetPage();
    },
    [resetPage],
  );

  const onRefresh = useCallback(() => {
    setPage(1);
    refetch();
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (page < totalPages && !isFetching) {
      setPage(prev => prev + 1);
    }
  }, [isFetching, page, totalPages]);

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        key: 'total',
        title: 'Total Orders',
        value: String(summary.totalOrders),
        subtext: 'All time',
        subtextColor: colors.green,
        iconBg: '#DCFCE7',
        icon: (
          <ShoppingBagIcon
            size={moderateScale(18)}
            color={colors.green}
            strokeWidth={2}
          />
        ),
      },
      {
        key: 'today',
        title: 'Today Sales',
        value: formatSalesAmount(summary.todaySales, currency),
        subtext: `${summary.todayOrdersCount} Order${summary.todayOrdersCount === 1 ? '' : 's'
          }`,
        subtextColor: colors.blue,
        iconBg: '#DBEAFE',
        icon: (
          <TrendingUpIcon
            size={moderateScale(18)}
            color={colors.blue}
            strokeWidth={2}
          />
        ),
      },
      {
        key: 'week',
        title: 'This Week Sales',
        value: formatSalesAmount(summary.weekSales, currency),
        subtext: weekGrowth.text,
        subtextColor: weekGrowth.color,
        iconBg: '#EDE9FE',
        icon: (
          <BarChartIcon
            size={moderateScale(18)}
            color={colors.purple}
            strokeWidth={2}
          />
        ),
      },
      {
        key: 'month',
        title: 'This Month Sales',
        value: formatSalesAmount(summary.monthSales, currency),
        subtext: monthGrowth.text,
        subtextColor: monthGrowth.color,
        iconBg: '#FFEDD5',
        icon: (
          <CalendarIcon
            size={moderateScale(18)}
            color={colors.orange}
            strokeWidth={2}
          />
        ),
      },
    ];
  }, [
    currency,
    monthGrowth.color,
    monthGrowth.text,
    summary,
    weekGrowth.color,
    weekGrowth.text,
  ]);

  const dateChipLabel =
    DATE_FILTER_OPTIONS.find(o => o.id === dateFilterId)?.label ??
    formatDateRangeLabel(dateRange.start, dateRange.end);

  const outletChipLabel =
    outletOptions.find(o => o.id === outletId)?.label ?? 'All Outlets';

  const paymentChipLabel =
    paymentOptions.find(o => o.id === paymentTypeId)?.label ??
    'All Payment Types';

  const sortChipLabel =
    SORT_OPTIONS.find(o => o.id === sort)?.label ?? 'Latest';

  const { labels: chartLabels, values: chartValues } = useMemo(
    () => normalizeSalesChart(dateFilterId, dateRange, salesChart),
    [dateFilterId, dateRange, salesChart],
  );

  const pickerConfig = useMemo(() => {
    switch (activePicker) {
      case 'date':
        return {
          title: 'Date range',
          options: DATE_FILTER_OPTIONS,
          selectedId: dateFilterId,
          onSelect: applyDateFilter,
        };
      case 'outlet':
        return {
          title: 'Outlet',
          options: [{ id: 'all', label: 'All Outlets' }, ...outletOptions],
          selectedId: outletId ?? 'all',
          onSelect: applyOutletFilter,
        };
      case 'payment':
        return {
          title: 'Payment type',
          options: [
            { id: 'all', label: 'All Payment Types' },
            ...paymentOptions,
          ],
          selectedId: paymentTypeId ?? 'all',
          onSelect: applyPaymentFilter,
        };
      case 'sort':
        return {
          title: 'Sort orders',
          options: SORT_OPTIONS,
          selectedId: sort,
          onSelect: applySort,
        };
      case 'status':
        return {
          title: 'Order status',
          options: STATUS_OPTIONS,
          selectedId: status,
          onSelect: applyStatus,
        };
      default:
        return null;
    }
  }, [
    activePicker,
    applyDateFilter,
    applyOutletFilter,
    applyPaymentFilter,
    applySort,
    applyStatus,
    dateFilterId,
    outletId,
    outletOptions,
    paymentTypeId,
    paymentOptions,
    sort,
    status,
  ]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <TopHeader
          title="Sales Orders"
          onBack={onBack}
          right={
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.filterBtn}
                activeOpacity={0.85}
                accessibilityLabel="Filter by status"
                onPress={() => setActivePicker('status')}>
                <FilterIcon size={moderateScale(16)} color={colors.green} />
                <Text style={styles.filterBtnText}>Filter</Text>
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          }
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isTablet() && {
              maxWidth: maxContentWidth(),
              width: '100%',
              alignSelf: 'center',
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={onRefresh}
              tintColor={colors.green}
            />
          }>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}>
            <FilterChip
              label={dateChipLabel}
              icon="calendar"
              active={dateFilterId !== 'today'}
              onPress={() => setActivePicker('date')}
            />
            {/* <FilterChip
              label={outletChipLabel}
              icon="globe"
              active={!!outletId}
              onPress={() => setActivePicker('outlet')}
            /> */}
            <FilterChip
              label={paymentChipLabel}
              icon="receipt"
              active={!!paymentTypeId}
              onPress={() => setActivePicker('payment')}
            />
          </ScrollView>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.green} />
            </View>
          ) : isError ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>
                Could not load sales data. Pull down to retry.
              </Text>
            </View>
          ) : (
            <>
              <SummaryMetricsPanel metrics={summaryMetrics} />

              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartHeaderLeft}>
                    <Text style={styles.chartTitle}>
                      {chartTitleForDateFilter(dateFilterId)}
                    </Text>
                    <Text style={styles.chartTotal}>
                      {formatSalesAmount(summary?.grossSales ?? 0, currency)}
                    </Text>
                    {monthGrowth.text ? (
                      <Text
                        style={[
                          styles.chartGrowth,
                          { color: monthGrowth.color },
                        ]}>
                        {monthGrowth.text}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.periodChip}>
                    <Text style={styles.periodChipText}>
                      {chartGranularityLabel(dateFilterId)}
                    </Text>
                  </View>
                </View>
                <SalesLineChart
                  width={Math.max(chartWidth, scale(240))}
                  height={verticalScale(190)}
                  labels={chartLabels}
                  values={chartValues}
                  currency={currency}
                />
              </View>

              <View style={styles.ordersSectionHeader}>
                <Text style={styles.ordersSectionTitle}>
                  Orders ({totalRecords})
                </Text>
                <TouchableOpacity
                  style={styles.sortChip}
                  activeOpacity={0.85}
                  onPress={() => setActivePicker('sort')}>
                  <Text style={styles.sortChipText}>
                    Sort by: {sortChipLabel}
                  </Text>
                  <Text style={styles.filterChipChevron}>▾</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.ordersList}>
                {orders.length === 0 ? (
                  <View style={styles.emptyOrders}>
                    <Text style={styles.emptyOrdersText}>
                      No orders for this period
                    </Text>
                  </View>
                ) : (
                  orders.map(order => (
                    <OrderRow
                      key={order.orderId}
                      order={order}
                      currency={currency}
                    />
                  ))
                )}
              </View>

              {page < totalPages ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadMore}
                  disabled={isFetching}
                  activeOpacity={0.85}>
                  {isFetching ? (
                    <ActivityIndicator color={colors.green} />
                  ) : (
                    <Text style={styles.loadMoreText}>Load more orders</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </ScrollView>

        {pickerConfig ? (
          <FilterPickerModal
            visible={activePicker != null}
            title={pickerConfig.title}
            options={pickerConfig.options}
            selectedId={pickerConfig.selectedId}
            onSelect={pickerConfig.onSelect}
            onClose={() => setActivePicker(null)}
          />
        ) : null}
      </SafeAreaView>
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    paddingBottom: verticalScale(32),
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    height: scale(36),
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.green,
  },
  filterBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.green,
  },
  filterBadge: {
    minWidth: scale(18),
    height: scale(18),
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
    marginLeft: scale(2),
  },
  filterBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: colors.white,
  },
  filterRow: {
    paddingHorizontal: spacing.xl,
    gap: scale(8),
    paddingBottom: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(10),
    maxWidth: scale(210),
    ...cardShadow,
  },
  filterChipActive: {
    borderColor: colors.green,
    backgroundColor: '#F0FDF4',
  },
  filterChipText: {
    flexShrink: 1,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.navy,
  },
  filterChipTextActive: {
    color: colors.greenDark,
    fontWeight: '700',
  },
  filterChipChevron: {
    fontSize: moderateScale(12),
    color: colors.muted,
    marginTop: verticalScale(1),
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '70%',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  pickerTitle: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.navy,
  },
  pickerScroll: {
    maxHeight: verticalScale(360),
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(14),
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    marginBottom: verticalScale(4),
  },
  pickerOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  pickerOptionText: {
    flex: 1,
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: colors.navy,
  },
  pickerOptionTextSelected: {
    color: colors.greenDark,
    fontWeight: '800',
  },
  loadingWrap: {
    paddingVertical: verticalScale(48),
    alignItems: 'center',
  },
  errorWrap: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.errorBg,
    borderRadius: radii.lg,
  },
  errorText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.error,
    textAlign: 'center',
  },
  metricsRow: {
    paddingHorizontal: spacing.xl,
    gap: scale(10),
    paddingBottom: spacing.lg,
  },
  metricCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    ...cardShadow,
  },
  metricIconWrap: {
    width: scale(34),
    height: scale(34),
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(8),
  },
  metricTitle: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: colors.muted,
  },
  metricValue: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
  },
  metricSubtext: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: colors.muted,
  },
  chartCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...cardShadow,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  chartHeaderLeft: {
    flex: 1,
    minWidth: 0,
  },
  chartTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.muted,
  },
  chartTotal: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: colors.navy,
  },
  chartGrowth: {
    marginTop: verticalScale(4),
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.green,
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: colors.borderLight,
    borderRadius: radii.sm,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
  },
  periodChipActive: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: colors.green,
  },
  periodChipText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.navy,
  },
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  chartEmpty: {
    paddingVertical: verticalScale(40),
    alignItems: 'center',
  },
  chartEmptyText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.muted,
  },
  chartYAxis: {
    width: scale(36),
    justifyContent: 'space-between',
    paddingVertical: verticalScale(8),
    marginRight: scale(2),
  },
  chartYLabel: {
    fontSize: moderateScale(9),
    fontWeight: '600',
    color: colors.mutedLight,
    textAlign: 'right',
  },
  chartTooltip: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  chartTooltipLabel: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: colors.muted,
    marginBottom: verticalScale(2),
    textAlign: 'center',
  },
  chartTooltipText: {
    fontSize: moderateScale(11),
    fontWeight: '800',
    color: colors.green,
    textAlign: 'center',
  },
  ordersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  ordersSectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.navy,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  sortChipText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.muted,
  },
  ordersList: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    ...cardShadow,
  },
  emptyOrders: {
    paddingVertical: verticalScale(32),
    alignItems: 'center',
  },
  emptyOrdersText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.muted,
  },
  loadMoreBtn: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    paddingVertical: verticalScale(14),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.green,
    backgroundColor: colors.white,
    alignItems: 'center',
    ...cardShadow,
  },
  loadMoreText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.green,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  orderIconWrap: {
    width: scale(42),
    height: scale(42),
    borderRadius: radii.pill,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orderBody: {
    flex: 1,
    minWidth: 0,
  },
  orderId: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: colors.navy,
  },
  orderMeta: {
    marginTop: verticalScale(3),
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: colors.muted,
    lineHeight: verticalScale(16),
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: verticalScale(4),
    flexShrink: 0,
  },
  orderAmount: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: colors.navy,
  },
});
