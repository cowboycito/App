//
//  FileDroppableView.m
//  NewExpensify
//
//  Created by @cowboycito on 08/11/22.
//

#import "FileDroppableView.h"
#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

@interface FileDroppableView () <UIDropInteractionDelegate>

@property (nonatomic, copy) RCTBubblingEventBlock onDrop;
@property (nonatomic, copy) RCTBubblingEventBlock onDragExit;
@property (nonatomic, copy) RCTBubblingEventBlock onDragOver;
@property (nonatomic, copy) RCTBubblingEventBlock onDropError;

@property (nonatomic, copy) NSArray *allowedDataTypes;

@end

@implementation FileDroppableView
  UIDropInteraction *_dropInteraction;
  NSMutableDictionary *_items;

- (instancetype)init {
    self = [super init];
    if (self) {
      _items = [[NSMutableDictionary alloc] init];
      _dropInteraction = [[UIDropInteraction alloc] initWithDelegate:self];

      [self setUserInteractionEnabled:YES];
      [self addInteraction:_dropInteraction];
    }
    return self;
}

- (BOOL)dropInteraction:(UIDropInteraction *)interaction canHandleSession:(id<UIDropSession>)session {
  NSLog(@"dropInteraction - canHandleSession");
  return true;
}

- (void)dropInteraction:(UIDropInteraction *)interaction sessionDidEnter:(id<UIDropSession>)session {
  NSLog(@"dropInteraction - sessionDidEnter");
}

- (void)dropInteraction:(UIDropInteraction *)interaction performDrop:(id<UIDropSession>)session {
  NSLog(@"dropInteraction - performDrop");
  
  dispatch_group_t dispatchGroup = dispatch_group_create();
  
//  NSError *error;
  for (UIDragItem *item in session.items) {
    NSItemProvider *provider = item.itemProvider;
    
    // image
    if ([provider hasItemConformingToTypeIdentifier:@"public.image"]) {
      [self loadSessionItemAsFileWithProvider:provider withUTI:@"public.image" inDispatchGroup:dispatchGroup];
      continue;
    }
    
    // video
    if ([provider hasItemConformingToTypeIdentifier:@"public.movie"]) {
      [self loadSessionItemAsFileWithProvider:provider withUTI:@"public.movie" inDispatchGroup:dispatchGroup];
      continue;
    }
    
    // other
    [self loadSessionItemAsFileWithProvider:provider withUTI:provider.registeredTypeIdentifiers.firstObject inDispatchGroup:dispatchGroup];
  }
  
  dispatch_group_notify(dispatchGroup, dispatch_get_main_queue(), ^{
    if (self.onDrop != nil) {
      self.onDrop(_items);
    }
    
    _items = [[NSMutableDictionary alloc] init];
  });
}

- (UIDropProposal *)dropInteraction:(UIDropInteraction *)interaction sessionDidUpdate:(id<UIDropSession>)session {
  NSLog(@"dropInteraction - sessionDidUpdate");
  
  if (self.onDragOver) {
    CGPoint dropPoint = [session locationInView:self];
    
    self.onDragOver(@{
      @"x": [[NSNumber alloc] initWithFloat:dropPoint.x],
      @"y": [[NSNumber alloc] initWithFloat:dropPoint.y]
    });
  }
  return [[UIDropProposal alloc] initWithDropOperation:UIDropOperationCopy];
}

- (nullable UITargetedDragPreview *)dropInteraction:(UIDropInteraction *)interaction previewForDroppingItem:(UIDragItem *)item withDefault:(UITargetedDragPreview *)defaultPreview {
  return defaultPreview;
}

- (void)dropInteraction:(UIDropInteraction *)interaction sessionDidExit:(id<UIDropSession>)session {
  NSLog(@"dropInteraction - sessionDidExit");
}

- (void)dropInteraction:(UIDropInteraction *)interaction concludeDrop:(id<UIDropSession>)session {
  NSLog(@"dropInteraction - concludeDrop");
}

- (void)dropInteraction:(UIDropInteraction *)interaction sessionDidEnd:(id<UIDropSession>)session {
  NSLog(@"dropInteraction - sessionDidEnd");
  if (self.onDragExit != nil) {
    self.onDragExit(nil);
  }
}

- (void)loadSessionItemAsFileWithProvider:(NSItemProvider *)provider withUTI:(NSString *)uti inDispatchGroup:(dispatch_group_t)dispatchGroup {
  dispatch_group_enter(dispatchGroup);
  
  NSURL *tempURL = [[NSURL fileURLWithPath:NSTemporaryDirectory() isDirectory:true] URLByAppendingPathComponent:@"file.ExpensifyFileDroppableView"];
  
  [provider loadFileRepresentationForTypeIdentifier:uti completionHandler:^(NSURL * _Nullable url, NSError * _Nullable err) {
    if (err != nil) {
      NSLog(@"Error moving loading file: %s", err.localizedDescription);
      dispatch_group_leave(dispatchGroup);
      return;
    }
    
    if (url != nil) {
      NSError *fileRelatedError;
      
      [[NSFileManager defaultManager] createDirectoryAtURL:tempURL withIntermediateDirectories:true attributes:nil error:&fileRelatedError];
      
      if (fileRelatedError != nil) {
        NSLog(@"Error creating temp directory: %s", fileRelatedError.localizedDescription);
        dispatch_group_leave(dispatchGroup);
        return;
      }
      
      NSString *fileName = url.pathComponents.lastObject;
      
      NSURL *accessedURL = [tempURL URLByAppendingPathComponent:fileName];
      
      if (![[NSFileManager defaultManager] fileExistsAtPath:accessedURL.path]) {
        [[NSFileManager defaultManager] moveItemAtURL:url toURL:accessedURL error:&fileRelatedError];
      }
      
      if (fileRelatedError != nil) {
        NSLog(@"Error moving file to temp directory: %s", fileRelatedError.localizedDescription);
        dispatch_group_leave(dispatchGroup);
        return;
      }
      
      NSString *absoluteUrlString = accessedURL.absoluteString;
      
      NSMutableArray *filesArray = [_items valueForKey:@"files"];
      if (filesArray == nil) {
        filesArray = [[NSMutableArray alloc] init];
        [_items setValue:filesArray forKey:@"files"];
      }
      
      [filesArray addObject:absoluteUrlString];
    }
    
    dispatch_group_leave(dispatchGroup);
  }];
}

@end
