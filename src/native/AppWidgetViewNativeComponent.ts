import type {HostComponent, ViewProps} from 'react-native';
import type {
  DirectEventHandler,
  Double,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type AppWidgetLongPressEvent = Readonly<{
  widgetId: Double;
  x: Double;
  y: Double;
}>;

export interface NativeProps extends ViewProps {
  widgetId: Double;
  widthPx: Double;
  heightPx: Double;
  onWidgetLongPress?: DirectEventHandler<AppWidgetLongPressEvent>;
}

export default codegenNativeComponent<NativeProps>('AppWidgetView', {
  interfaceOnly: true,
}) as HostComponent<NativeProps>;
