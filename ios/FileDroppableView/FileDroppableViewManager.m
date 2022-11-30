//
//  FileDroppableViewManager.m
//  NewExpensify
//
//  Created by @cowboycito on 08/11/22.
//

#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>
#import "FileDroppableView.h"

@interface FileDroppableViewManager : RCTViewManager
@end

@implementation FileDroppableViewManager

RCT_EXPORT_MODULE(FileDroppableView)

RCT_EXPORT_VIEW_PROPERTY(onDrop, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDragExit, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDragOver, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDropError, RCTBubblingEventBlock)

RCT_EXPORT_VIEW_PROPERTY(allowedDataTypes, NSArray)

- (UIView *)view {
  return [[FileDroppableView alloc] init];
}

@end
