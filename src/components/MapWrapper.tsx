interface MapWrapperProps {
  layout: 'full' | 'track';
  children: React.ReactNode;
}

export const MapWrapper: React.FC<MapWrapperProps> = ({ layout, children }) => {
  return (
    <div className={`map-wrapper ${layout}`}>
      {children}
    </div>
  );
};
