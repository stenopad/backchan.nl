
// This file is never going to be run through mocha on the server because it
// depends on the DOM being present, which I don't really want to work out
// quite yet. So we're not going to do the on-server-or-not dance we do
// in client.js and model.js, since this is purely local. We assume that
// we have model and already loaded here.

// Here's the hierarchy:
// BackchannlBar    contains everything else; absolutely positioned on the 
//                  edge of the screen.
//
// ChatBarView      contains the chat entry text field, and is the parent of 
//                  two ChatListViews, one with transparent background + no
//                  scroll, one with an opaque background + scroll
//
// ChatMessageView  each individual chat message. Will also have instances of
//                  UserView within it.
//
// PostListView     flush with the left edge of the screen, contains the 
//                  posts header, a text field for entering new posts, and
//                  the scrollable list of current posts
//
// PostView         The view for each individual post. Has lots of features +
//                  events that we won't go into here. Has UserViews in it, 
//                  but that's about it. 


views = {};

views.CHAT_TIMEOUT = 10000;

views.PostView = Backbone.View.extend({
    tagName: 'div',
    
    template: _.template('<div class="post"></div>'),
    
    events: {
        
    },
    
    initialize: function() {
        this.model.bind('change', this.render, this);
        this.model.bind('destroy', this.remove, this);
    },
    
    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
});

views.PostListView = Backbone.View.extend({
    
});



views.ChatView = Backbone.View.extend({
    className: 'message',
    template: _.template('<span class="name"><%=fromName%></span>\
<span class="affiliation"><%=fromAffiliation%></span>: \
<span class="text"><%=text%></span>'),
    
    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    },
});

views.ChatListView = Backbone.View.extend({
    className: 'chats',
    views: {},
    
    initialize: function(params) {
        Backbone.View.prototype.initialize.call(this,params);
        
        this.collection.bind('add', this.add, this);
        this.collection.bind('remove', this.remove, this);
        
        this.render();
    },
    
    add: function(chat) {
        console.log("adding chat to view");
        // append to the el
        var newView = new views.ChatView({model:chat});
        this.views[chat.cid] = newView;
        $(this.el).append(newView.render().el);
    },
    
    remove: function(chat) {
        console.log("removing chat from view");
        // animate it out of the el. the trick here is getting a hold of it,
        // which we'll use cid for.
        var viewToRemove = this.views[chat.cid];
        
        delete this.views[chat.cid];
        
        $(viewToRemove.el).animate({
            opacity: 0.0
        }, 250, "linear", function() {
            $(viewToRemove).remove();
            
        });
    },
    
    render: function() {
        console.log("Rendering ChatListView");
        $(this.el).html("");
        
        if(this.collection && this.collection.length > 0) {
            this.collection.each(function(chat) {
                var view = new views.ChatView({model:chat});
                var newMsgView = view.render().el;
                $(this.el).append(newMsgView);
            }, this);
        }
        
        return this;
    }
});

views.ChatBarView = Backbone.View.extend({
    id: "chat",
    template: _.template('<form id="chat-entry-form">\
    <input type="text" name="chat-input" title="say something!" value="" id="chat-input" autocomplete="off">\
    </form>'),
    
    events: {
        "submit #chat-entry-form":"chat"
    },
    
    chatList: null,
    chatListView: null,
    
    initialize: function() {
        this.chatList = new model.ExpiringChatList();
        this.chatListView = new views.ChatListView({collection:this.chatList});
    },
    
    render: function() {
        $(this.el).html(this.template());
        
        // we don't need to force a render on this - it'll render itself
        $(this.el).append(this.chatListView.el);
        return this;
    },
    
    chat: function(event) {
        
        // grab the text, send it to the server, and clear the field
        var text = this.$("#chat-input").val();
        
        this.$("#chat-input").val("");
        
        conn.chat(text);
        
        event.preventDefault();
    }
});

views.BackchannlBarView = Backbone.View.extend({
    id: "bar",
    template: _.template(''),
    
    chat: null,
    conn: null,
    initialize: function(conn) {
        this.chat = new views.ChatBarView();
        this.conn = conn;
        
        this.conn.bind("message.chat", function(chat) {
            this.chat.chatList.add(chat);
        }, this);
    },
    
    render: function() {
        $(this.el).html(this.template());
        $(this.el).append(this.chat.render().el);
        return this;
    },
});