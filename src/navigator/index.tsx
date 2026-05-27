import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import RootStack from './RootStack';

const AppContainer = () => {
  //   const dispatch = useDispatch<AppDispatch>();

  //   useEffect(() => {
  //     dispatch(bootstrapAuth());
  //   }, [dispatch]);

  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
};

export default AppContainer;
