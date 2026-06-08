#import "FlipperManager.h"

#if DEBUG
#import <FlipperKit/FlipperClient.h>
#import <FlipperKitLayoutPlugin/FlipperKitLayoutPlugin.h>
#import <FlipperKitNetworkPlugin/FlipperKitNetworkPlugin.h>
#import <FlipperKitUserDefaultsPlugin/FKUserDefaultsPlugin.h>
#import <SKIOSNetworkPlugin/SKIOSNetworkAdapter.h>
#endif

@implementation FlipperManager

+ (void)initializeFlipperWithApplication:(UIApplication *)application {
#if DEBUG
  FlipperClient *client = [FlipperClient sharedClient];
  SKDescriptorMapper *layoutDescriptorMapper =
      [[SKDescriptorMapper alloc] initWithDefaults];
  [client addPlugin:[[FlipperKitLayoutPlugin alloc]
                            initWithRootNode:application
                       withDescriptorMapper:layoutDescriptorMapper]];
  [client addPlugin:[[FKUserDefaultsPlugin alloc] initWithSuiteName:nil]];
  [client addPlugin:[[FlipperKitNetworkPlugin alloc]
                        initWithNetworkAdapter:[SKIOSNetworkAdapter new]]];
  [client start];
#endif
}

@end
