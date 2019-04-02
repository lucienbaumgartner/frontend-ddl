library(dplyr)
library(magrittr)

setwd('~/frontend-ddl/graphics/scatter-plot/')
rm(list=ls())

df <- read.csv('Various_Static_Account_List.csv', stringsAsFactors = F)

df %<>%   
  filter(!is.na(First.Name)&!is.na(User_id)) %>% 
  select(User_id, Twitter.Name) %>% 
  mutate(twitter_href=paste0(
    '<a class="twitter-timeline" href="https://twitter.com/', 
    Twitter.Name,
    '?ref_src=twsrc%5Etfw"></a> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
  ))

write.csv(df, file = 'metadata_v2.csv', row.names = F)
