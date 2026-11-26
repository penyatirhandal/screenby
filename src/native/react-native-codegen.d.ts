declare module 'react-native/Libraries/Types/CodegenTypes' {
  export type Double = number;
  export type DirectEventHandler<T> = (event: {nativeEvent: T}) => void | Promise<void>;
}

declare module 'react-native/Libraries/Utilities/codegenNativeComponent' {
  import type {HostComponent} from 'react-native';
  function codegenNativeComponent<Props extends object>(
    componentName: string,
    options?: {interfaceOnly?: boolean},
  ): HostComponent<Props>;
  export default codegenNativeComponent;
}
